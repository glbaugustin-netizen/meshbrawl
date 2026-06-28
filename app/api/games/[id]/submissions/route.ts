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

  // ─── Complétion anticipée des slots de vote ──────────────────────────────────
  // Pour chaque rendu, les votants requis = tous les autres rendus (on ne vote
  // jamais pour soi-même) → required = nb de rendus - 1. Dès que TOUS ont voté
  // pour une cible, on enregistre completed_at = now() (heure serveur, une seule
  // fois). Tous les clients lisent ce timestamp partagé et avancent leur chrono
  // de façon synchronisée — jamais de décision locale qui désyncroniserait.
  let completions: { targetPlayerId: string; completedAt: number }[] = []

  if (votingStartedAtMs !== null && submissions.length >= 2) {
    const required     = submissions.length - 1
    const submittedIds = new Set(submissions.map((s) => s.id))

    const { data: votesData } = await admin
      .from('votes')
      .select('target_player_id, voter_id')
      .eq('game_id', gameId)

    // Votants DISTINCTS par cible (robuste à un éventuel double-vote)
    const voters: Record<string, Set<string>> = {}
    for (const v of votesData ?? []) {
      const t = v.target_player_id as string
      if (!submittedIds.has(t)) continue
      ;(voters[t] ??= new Set()).add(v.voter_id as string)
    }

    // Cibles dont tous les votants requis ont voté
    const completeTargets = submissions
      .map((s) => s.id)
      .filter((id) => (voters[id]?.size ?? 0) >= required)

    if (completeTargets.length > 0) {
      // upsert "ignore duplicates" : la 1re complétion garde son completed_at
      // (default now()), les appels suivants ne l'écrasent pas.
      await admin
        .from('vote_completions')
        .upsert(
          completeTargets.map((id) => ({ game_id: gameId, target_player_id: id })),
          { onConflict: 'game_id,target_player_id', ignoreDuplicates: true }
        )
    }

    const { data: compRows } = await admin
      .from('vote_completions')
      .select('target_player_id, completed_at')
      .eq('game_id', gameId)

    completions = (compRows ?? []).map((c) => ({
      targetPlayerId: c.target_player_id as string,
      completedAt:    new Date(c.completed_at as string).getTime(),
    }))
  }

  return NextResponse.json({
    submissions,
    totalPlayers,
    votingStartedAt: votingStartedAtMs, // epoch ms ou null
    serverNow:       Date.now(),        // epoch ms — permet de corriger le décalage d'horloge
    status:          gameRes.data?.status ?? 'in_progress',
    completions,                         // [{ targetPlayerId, completedAt(ms) }]
    noSubmissions:   endsAtPassed && submissions.length === 0, // temps écoulé sans aucun rendu
  })
}
