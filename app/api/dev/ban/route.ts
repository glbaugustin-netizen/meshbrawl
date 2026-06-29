import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Bannit / débannit un joueur. Mêmes garde-fous que le dashboard dev :
//   1. l'appelant doit être connecté avec le compte admin,
//   2. il doit fournir le mot de passe dev.

export const dynamic = 'force-dynamic'

const ADMIN_ID     = '14f2b93c-1b7d-4806-822e-d687ea944bef'
const DEV_PASSWORD = process.env.DEV_PASSWORD ?? 'meshbrawl-dev-2026'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { password, userId, banned } = await request.json().catch(() => ({}))
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }
  if (!userId) {
    return NextResponse.json({ error: 'userId manquant' }, { status: 400 })
  }
  if (userId === ADMIN_ID) {
    return NextResponse.json({ error: 'Impossible de bannir le compte dev' }, { status: 400 })
  }

  const db = admin()

  const { error } = await db
    .from('users')
    .update({ banned: !!banned })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort le joueur banni de ses lobbies "waiting" (on ne touche pas aux parties
  // déjà en cours pour ne pas fausser le calcul d'ELO/votes).
  if (banned) {
    const { data: rows } = await db
      .from('game_players')
      .select('game_id, games!inner(status)')
      .eq('user_id', userId)
      .eq('games.status', 'waiting')

    const waitingIds = (rows ?? []).map((r) => (r as { game_id: string }).game_id)
    if (waitingIds.length) {
      await db.from('game_players').delete().eq('user_id', userId).in('game_id', waitingIds)
    }
  }

  return NextResponse.json({ success: true, banned: !!banned })
}
