import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Route de monitoring réservée au dev. Double verrou :
//   1. l'appelant doit être connecté avec le compte admin (UUID),
//   2. il doit fournir le mot de passe dev (env DEV_PASSWORD, fallback par défaut).
// Le mot de passe transite dans le body (POST) plutôt que l'URL pour éviter
// qu'il finisse dans les logs serveur.

export const dynamic = 'force-dynamic'

const ADMIN_ID      = '14f2b93c-1b7d-4806-822e-d687ea944bef'
const DEV_PASSWORD  = process.env.DEV_PASSWORD ?? 'meshbrawl-dev-2026'
const ONLINE_WINDOW = 5 * 60 * 1000 // 5 min, identique à OnlineCounter

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

  const { password } = await request.json().catch(() => ({ password: '' }))
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const db    = admin()
  const since = new Date(Date.now() - ONLINE_WINDOW).toISOString()

  // Joueurs en ligne
  const { data: players, error } = await db
    .from('users')
    .select('id, pseudo, avatar_color, elo, country, parties_jouees, last_seen, twitch')
    .gte('last_seen', since)
    .order('last_seen', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Parties actives (non terminées) → qui est "en partie"
  const { data: activeRows } = await db
    .from('game_players')
    .select('user_id, games!inner(id, mode, status)')
    .neq('games.status', 'finished')

  const inGame = new Map<string, { mode: string; status: string }>()
  for (const row of (activeRows ?? []) as unknown as
    { user_id: string; games: { mode: string; status: string } }[]) {
    if (row.games) inGame.set(row.user_id, { mode: row.games.mode, status: row.games.status })
  }

  const enriched = (players ?? []).map((p) => ({
    ...p,
    game: inGame.get(p.id) ?? null,
  }))

  return NextResponse.json({
    serverNow: Date.now(),
    count:     enriched.length,
    players:   enriched,
  })
}
