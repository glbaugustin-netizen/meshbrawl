import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { mode, duration_seconds } = await request.json()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  // Joueur banni → interdit de rejoindre une partie.
  const { data: me } = await supabase
    .from('users')
    .select('banned')
    .eq('id', user.id)
    .single()
  if (me?.banned) {
    return NextResponse.json({ error: 'Compte banni' }, { status: 403 })
  }

  // Retire l'utilisateur de toutes ses anciennes parties "waiting" (évite les lobbies fantômes)
  const { data: myGames } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('user_id', user.id)

  if (myGames?.length) {
    const myGameIds = myGames.map((g) => g.game_id)
    const { data: waitingGames } = await supabase
      .from('games')
      .select('id')
      .eq('status', 'waiting')
      .in('id', myGameIds)

    if (waitingGames?.length) {
      const waitingIds = waitingGames.map((g) => g.id)
      await supabase
        .from('game_players')
        .delete()
        .eq('user_id', user.id)
        .in('game_id', waitingIds)
      // Supprime les parties waiting devenues vides
      for (const gId of waitingIds) {
        const { count } = await supabase
          .from('game_players')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gId)
        if (count === 0) {
          await supabase.from('games').delete().eq('id', gId)
        }
      }
    }
  }

  // Cherche une partie en attente avec le même mode et durée
  const { data: existingGame } = await supabase
    .from('games')
    .select('id')
    .eq('status', 'waiting')
    .eq('mode', mode)
    .eq('duration_seconds', duration_seconds)
    .limit(1)
    .single()

  let gameId: string

  if (existingGame) {
    // Vérifie que la partie n'est pas pleine
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', existingGame.id)

    if ((count ?? 0) < 10) {
      gameId = existingGame.id
    } else {
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({ mode, duration_seconds, status: 'waiting' })
        .select('id')
        .single()
      if (error || !newGame) return NextResponse.json({ error: error?.message }, { status: 500 })
      gameId = newGame.id
    }
  } else {
    const { data: newGame, error } = await supabase
      .from('games')
      .insert({ mode, duration_seconds, status: 'waiting' })
      .select('id')
      .single()
    if (error || !newGame) return NextResponse.json({ error: error?.message }, { status: 500 })
    gameId = newGame.id
  }

  // Vérifie si déjà dans la partie
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase
      .from('game_players')
      .insert({ game_id: gameId, user_id: user.id, status: 'waiting' })
  }

  return NextResponse.json({ gameId })
}
