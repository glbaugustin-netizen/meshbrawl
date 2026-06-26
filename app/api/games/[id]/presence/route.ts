import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Un joueur est considéré déconnecté si son dernier ping (users.last_seen) date
// de plus de ce délai. Le Pinger ping toutes les 15s ; on laisse de la marge
// pour les blips réseau / onglets en arrière-plan (timers throttlés).
const PRESENCE_TIMEOUT_MS = 45 * 1000

// Purge les joueurs déconnectés d'un lobby (statut 'waiting'). Utilise le service
// role car la policy RLS de game_players n'autorise à supprimer que SA PROPRE
// ligne — le chef ne pourrait donc pas retirer un joueur fantôme.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // On ne purge que les lobbies (pas une partie en cours / terminée).
  const { data: game } = await admin
    .from('games')
    .select('status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'waiting') return NextResponse.json({ ok: true, skipped: true })

  const { data: players } = await admin
    .from('game_players')
    .select('id, users(last_seen)')
    .eq('game_id', gameId)

  const cutoff = Date.now() - PRESENCE_TIMEOUT_MS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staleIds = (players ?? []).filter((p: any) => {
    const ls = p.users?.last_seen ? new Date(p.users.last_seen).getTime() : 0
    return ls < cutoff
  }).map((p: { id: string }) => p.id)

  if (staleIds.length > 0) {
    await admin.from('game_players').delete().in('id', staleIds)
  }

  const remaining = (players?.length ?? 0) - staleIds.length

  // Lobby vidé → on supprime la partie pour ne pas laisser de coquille vide.
  if (remaining <= 0) {
    await admin.from('games').delete().eq('id', gameId)
  }

  return NextResponse.json({ ok: true, pruned: staleIds.length, remaining })
}
