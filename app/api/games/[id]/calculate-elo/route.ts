import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const cookieStore = await cookies()

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

  // 1. Vérifie que la partie existe et n'est pas déjà calculée
  const { data: game } = await supabase
    .from('games')
    .select('status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status === 'finished') return NextResponse.json({ ok: true, skipped: true })

  // 2. Récupère tous les game_players de cette partie
  const { data: players } = await supabase
    .from('game_players')
    .select('id, user_id')
    .eq('game_id', gameId)

  if (!players || players.length === 0)
    return NextResponse.json({ error: 'No players' }, { status: 400 })

  const totalPlayers = players.length
  const maxPoints    = (totalPlayers - 1) * 10

  // 3. Récupère tous les votes de cette partie
  const { data: votes } = await supabase
    .from('votes')
    .select('target_player_id, vote_type')
    .eq('game_id', gameId)

  // 4. Calcule les points pour chaque joueur
  const pointsMap: Record<string, number> = {}
  players.forEach((p) => { pointsMap[p.id] = 0 })

  ;(votes ?? []).forEach(({ target_player_id, vote_type }) => {
    if (!(target_player_id in pointsMap)) return
    if (vote_type === 'bien')   pointsMap[target_player_id] += 10
    else if (vote_type === 'mal')    pointsMap[target_player_id] -= 5
    else if (vote_type === 'etoile') pointsMap[target_player_id] += 25
  })

  // Joueurs sans aucun vote reçu → -2
  players.forEach((p) => {
    const hasVotes = (votes ?? []).some((v) => v.target_player_id === p.id)
    if (!hasVotes) pointsMap[p.id] = -2
  })

  // 5. Calcule l'elo_change et met à jour game_players + users
  for (const player of players) {
    const pts       = pointsMap[player.id]
    const eloChange = maxPoints > 0 ? Math.round((pts / maxPoints) * (totalPlayers * 10)) : 0

    await supabase
      .from('game_players')
      .update({ points_received: pts, elo_change: eloChange, rank: 0 })
      .eq('id', player.id)

    const { data: userData } = await supabase
      .from('users')
      .select('elo, parties_jouees')
      .eq('id', player.user_id)
      .single()

    if (userData) {
      await supabase
        .from('users')
        .update({
          elo:            Math.max(0, userData.elo + eloChange),
          parties_jouees: userData.parties_jouees + 1,
        })
        .eq('id', player.user_id)
    }
  }

  // 6. Calcule les rangs par points reçus
  const sorted = players
    .map((p) => ({ ...p, pts: pointsMap[p.id] }))
    .sort((a, b) => b.pts - a.pts)

  for (let i = 0; i < sorted.length; i++) {
    await supabase
      .from('game_players')
      .update({ rank: i + 1 })
      .eq('id', sorted[i].id)
  }

  // 7. Marque la partie comme terminée
  await supabase
    .from('games')
    .update({ status: 'finished' })
    .eq('id', gameId)

  // 8. Supprime les fichiers de soumission du bucket
  const { data: submissions } = await supabase
    .from('game_players')
    .select('submission_url')
    .eq('game_id', gameId)
    .not('submission_url', 'is', null)

  if (submissions && submissions.length > 0) {
    const paths = submissions
      .map((s) => {
        if (!s.submission_url) return null
        const match = s.submission_url.match(/\/submissions\/(.+?)(\?|$)/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('submissions')
        .remove(paths)
      if (storageError) console.error('Erreur suppression fichiers:', storageError)
    }
  }

  return NextResponse.json({ ok: true })
}
