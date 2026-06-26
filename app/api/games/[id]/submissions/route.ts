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

  const [submittedRes, totalRes, gameRes] = await Promise.all([
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
    admin
      .from('games')
      .select('voting_started_at, status, ends_at')
      .eq('id', gameId)
      .single(),
  ])

  if (submittedRes.error) return NextResponse.json({ error: submittedRes.error.message }, { status: 500 })

  const submissions  = submittedRes.data ?? []
  const totalPlayers = totalRes.count ?? 0

  // Démarre la phase de vote (server-authoritative) dès que TOUS ont soumis.
  // On le fait avec le service role pour bypasser le RLS, et une seule fois
  // (si voting_started_at est encore null). Tous les clients liront ensuite
  // exactement la même valeur en millisecondes epoch — aucune ambiguïté de
  // fuseau horaire possible.
  let votingStartedAtMs: number | null =
    gameRes.data?.voting_started_at ? new Date(gameRes.data.voting_started_at).getTime() : null

  // Démarrer si tous ont soumis, OU si le temps de partie est écoulé et qu'il y a
  // au moins une soumission (anti-blocage si un joueur ne soumet jamais).
  const endsAtPassed = gameRes.data?.ends_at ? Date.now() > new Date(gameRes.data.ends_at).getTime() : false
  const allSubmitted = totalPlayers > 0 && submissions.length >= totalPlayers
  const shouldStart  = allSubmitted || (endsAtPassed && submissions.length >= 1)

  if (votingStartedAtMs === null && shouldStart) {
    const nowIso = new Date().toISOString()
    // Ne setter que si toujours null (évite d'écraser une valeur concurrente)
    const { data: updated } = await admin
      .from('games')
      .update({ voting_started_at: nowIso })
      .eq('id', gameId)
      .is('voting_started_at', null)
      .select('voting_started_at')
      .single()

    if (updated?.voting_started_at) {
      votingStartedAtMs = new Date(updated.voting_started_at).getTime()
    } else {
      // Un autre process l'a setté entre-temps : relire la valeur
      const { data: reread } = await admin
        .from('games')
        .select('voting_started_at')
        .eq('id', gameId)
        .single()
      votingStartedAtMs = reread?.voting_started_at ? new Date(reread.voting_started_at).getTime() : null
    }
  }

  return NextResponse.json({
    submissions,
    totalPlayers,
    votingStartedAt: votingStartedAtMs, // epoch ms ou null
    serverNow:       Date.now(),        // epoch ms — permet de corriger le décalage d'horloge
    status:          gameRes.data?.status ?? 'in_progress',
  })
}
