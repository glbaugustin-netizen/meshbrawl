import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const cookieStore = await cookies()

  // Client lié à la session (pour identifier le joueur)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try {
            c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  // Client admin (service role) pour bypasser RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Pénalité -20 ELO
  const { data: userData } = await admin
    .from('users')
    .select('elo')
    .eq('id', user.id)
    .single()

  if (userData) {
    await admin
      .from('users')
      .update({ elo: Math.max(0, (userData.elo ?? 1000) - 20) })
      .eq('id', user.id)
  }

  // 2. Supprime le joueur de la partie
  await admin
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', user.id)

  // 3. Vérifie s'il reste des joueurs
  const { count } = await admin
    .from('game_players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)

  if (count === 0) {
    // 4. Supprime les fichiers du bucket via listing
    const { data: folders } = await admin.storage
      .from('submissions')
      .list(gameId)

    if (folders && folders.length > 0) {
      for (const folder of folders) {
        const { data: files } = await admin.storage
          .from('submissions')
          .list(`${gameId}/${folder.name}`)
        if (files && files.length > 0) {
          const paths = files.map((f) => `${gameId}/${folder.name}/${f.name}`)
          await admin.storage.from('submissions').remove(paths)
        }
      }
    }

    // 5. Supprime la partie
    await admin.from('games').delete().eq('id', gameId)
  }

  return NextResponse.json({ ok: true, remaining: count ?? 0 })
}
