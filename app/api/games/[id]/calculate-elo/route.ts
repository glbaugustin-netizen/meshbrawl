import { createClient } from "@supabase/supabase-js"
import { NextResponse } from 'next/server'

const VOTE_DURATION_MS = 60 * 1000

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  // Service role pour TOUTES les opérations : sinon, sous RLS, la liste des
  // joueurs/votes serait partielle (vue de l'appelant) et fausserait l'ELO.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Vérifie que la partie existe et n'est pas déjà calculée
  const { data: game } = await supabase
    .from('games')
    .select('status, voting_started_at')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status === 'finished')   return NextResponse.json({ ok: true, skipped: true })
  // Un autre process est déjà en train de calculer → on laisse le poller attendre.
  if (game.status === 'calculating') return NextResponse.json({ ok: false, calculating: true })

  // 2. Récupère tous les game_players de cette partie
  const { data: players } = await supabase
    .from('game_players')
    .select('id, user_id, status')
    .eq('game_id', gameId)

  if (!players || players.length === 0)
    return NextResponse.json({ error: 'No players' }, { status: 400 })

  // GARDE TEMPORELLE : on refuse de terminer la partie tant que la fenêtre de
  // vote partagée n'est pas écoulée. Empêche n'importe quel joueur (timer en
  // avance, horloge décalée…) de clôturer prématurément le vote des autres.
  const submitted      = players.filter((p) => p.status === 'submitted')
  const submittedCount = submitted.length
  if (game.voting_started_at && submittedCount > 0) {
    const startMs   = new Date(game.voting_started_at).getTime()
    const windowEnd = startMs + submittedCount * VOTE_DURATION_MS
    if (Date.now() < windowEnd) {
      // Clôture anticipée : si TOUS les votes requis sont déjà tombés (vérifié
      // côté serveur sur la table votes), on autorise la fin avant la fenêtre
      // complète — cohérent avec la complétion anticipée des slots de vote. Sinon
      // on attend la fin de la fenêtre partagée (protège contre un client en
      // avance qui clôturerait le vote des autres).
      let allVotesIn = false
      if (submittedCount >= 2) {
        const { data: earlyVotes } = await supabase
          .from('votes')
          .select('target_player_id, voter_id')
          .eq('game_id', gameId)
        const required     = submittedCount - 1
        const submittedIds = new Set(submitted.map((s) => s.id))
        const voters: Record<string, Set<string>> = {}
        for (const v of earlyVotes ?? []) {
          const t = v.target_player_id as string
          if (!submittedIds.has(t)) continue
          ;(voters[t] ??= new Set()).add(v.voter_id as string)
        }
        allVotesIn = submitted.every((s) => (voters[s.id]?.size ?? 0) >= required)
      }
      if (!allVotesIn) {
        return NextResponse.json({ ok: false, tooEarly: true })
      }
    }
  }

  // VERROU ATOMIQUE : passe le statut in_progress → calculating. Comme plusieurs
  // joueurs appellent cette route en parallèle, sans ce verrou ils liraient tous
  // 'in_progress' avant qu'aucun n'écrive 'finished' et appliqueraient l'ELO
  // PLUSIEURS FOIS (ex. +8 ELO devient +24 avec 3 joueurs). Un seul process
  // gagne la transition ; les autres sont court-circuités.
  const { data: claimed, error: claimErr } = await supabase
    .from('games')
    .update({ status: 'calculating' })
    .eq('id', gameId)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()

  if (claimErr) {
    // Cas improbable (contrainte CHECK sur status) : on ne bloque pas la partie,
    // on retombe sur l'ancien comportement plutôt que de la laisser coincée.
    console.error('Verrou status échoué:', claimErr.message)
  } else if (!claimed) {
    // Un autre process a déjà pris la main → rien à faire.
    return NextResponse.json({ ok: true, skipped: true })
  }

  const totalPlayers = players.length
  const maxPoints    = (totalPlayers - 1) * 10

  try {
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

  // 6. Calcule les rangs avec gestion des ex-aequo
  const sorted = players
    .map((p) => ({ ...p, pts: pointsMap[p.id] }))
    .sort((a, b) => b.pts - a.pts);

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    // Si même score que le précédent → même rang
    if (i > 0 && sorted[i].pts === sorted[i - 1].pts) {
      await supabase
        .from('game_players')
        .update({ rank: currentRank })
        .eq('id', sorted[i].id);
    } else {
      currentRank = i + 1;
      await supabase
        .from('game_players')
        .update({ rank: currentRank })
        .eq('id', sorted[i].id);
    }
  }

  // 7. Marque la partie comme terminée (déverrouille + signale aux pollers)
  await supabase
    .from('games')
    .update({ status: 'finished' })
    .eq('id', gameId)

  // 8. Supprime les fichiers de soumission du bucket (réutilise le client admin)
  const { data: folders } = await supabase.storage
    .from("submissions")
    .list(gameId);

  if (folders && folders.length > 0) {
    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from("submissions")
        .list(`${gameId}/${folder.name}`);

      if (files && files.length > 0) {
        const paths = files.map((f) => `${gameId}/${folder.name}/${f.name}`);
        const { error } = await supabase.storage
          .from("submissions")
          .remove(paths);
        if (error) console.error("Erreur suppression:", error);
      }
    }
  }

  return NextResponse.json({ ok: true })

  } catch (e) {
    // Échec en cours de calcul : on libère le verrou pour permettre une
    // nouvelle tentative (sinon la partie resterait bloquée en 'calculating').
    await supabase
      .from('games')
      .update({ status: 'in_progress' })
      .eq('id', gameId)
      .eq('status', 'calculating')
    console.error('calculate-elo a échoué:', e)
    return NextResponse.json({ error: 'Calcul échoué' }, { status: 500 })
  }
}
