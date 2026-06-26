import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const cookieStore = await cookies()

  // Vérifie que le joueur est authentifié
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

  // Service role pour bypasser le RLS et voir toutes les soumissions
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [submittedRes, totalRes] = await Promise.all([
    admin
      .from('game_players')
      .select('id, user_id, submission_url, submission_type')
      .eq('game_id', gameId)
      .eq('status', 'submitted')
      .order('id', { ascending: true }),
    admin
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId),
  ])

  if (submittedRes.error) return NextResponse.json({ error: submittedRes.error.message }, { status: 500 })

  return NextResponse.json({
    submissions:  submittedRes.data ?? [],
    totalPlayers: totalRes.count ?? 0,
  })
}
