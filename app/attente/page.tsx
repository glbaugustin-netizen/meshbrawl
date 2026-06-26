"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_SLOTS      = 10;
const MIN_PLAYERS      = 3;
const COUNTDOWN_START  = 30;

const DURATION_LABELS: Record<number, string> = {
  600:    '10 MIN',
  3600:   '1 HEURE',
  18000:  '5 HEURES',
  86400:  '1 JOUR',
  604800: '1 SEMAINE',
}

const MODE_LABELS: Record<string, string> = {
  modelisation: 'MODELISATION',
  texturing:    'TEXTURING',
  animation:    'ANIMATION',
  imaginaire:   'IMAGINAIRE',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GamePlayer {
  id:      string;
  user_id: string;
  status:  string;
  users: {
    pseudo:       string;
    avatar_color: string | null;
    country:      string | null;
    elo:          number | null;
  } | null;
}

interface Game {
  mode:             string;
  duration_seconds: number;
  status:           string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttentePage() {
  return (
    <Suspense fallback={
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">Chargement...</p>
      </main>
    }>
      <AttentePageInner />
    </Suspense>
  );
}

function AttentePageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const gameId       = searchParams.get('gameId');
  const supabase     = createClient();

  const [players,     setPlayers]     = useState<GamePlayer[]>([]);
  const [game,        setGame]        = useState<Game | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [countdown,   setCountdown]   = useState(COUNTDOWN_START);
  const [launched,    setLaunched]    = useState(false);
  const startingRef       = useRef(false);
  const intervalRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownStarted  = useRef(false);
  const redirectingRef    = useRef(false); // évite les redirections multiples vers /jeu

  // Récupère l'utilisateur connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge les données de la partie
  useEffect(() => {
    if (!gameId) return;

    async function loadGame() {
      const { data } = await supabase
        .from('games')
        .select('mode, duration_seconds, status')
        .eq('id', gameId)
        .single();
      if (data) {
        setGame(data);
        // Fallback : si la partie a démarré et que l'event realtime n'est pas
        // arrivé (réplication 'games' non activée), on bascule quand même.
        if (data.status === 'in_progress' && !redirectingRef.current) {
          redirectingRef.current = true;
          setLaunched(true);
          setTimeout(() => router.push(`/jeu?gameId=${gameId}`), 1500);
        }
      }
    }

    async function loadPlayers() {
      const { data } = await supabase
        .from('game_players')
        .select('id, user_id, status, users(pseudo, avatar_color, country, elo)')
        .eq('game_id', gameId);
      setPlayers((data as unknown as GamePlayer[]) || []);
    }

    loadGame();
    loadPlayers();

    // Temps réel — joueurs
    const playerChannel = supabase
      .channel(`game-players:${gameId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'game_players',
        filter: `game_id=eq.${gameId}`,
      }, () => loadPlayers())
      .subscribe();

    // Temps réel — statut de la partie
    const gameChannel = supabase
      .channel(`game-status:${gameId}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        if (payload.new.status === 'in_progress' && !redirectingRef.current) {
          redirectingRef.current = true;
          setLaunched(true);
          setTimeout(() => router.push(`/jeu?gameId=${gameId}`), 1500);
        }
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      loadPlayers();
      loadGame(); // recheck du statut → fallback si le realtime 'games' ne fire pas
    }, 3000);

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(gameChannel);
      clearInterval(pollInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Lance la partie via l'API
  async function startGame() {
    if (startingRef.current || !gameId) return;
    startingRef.current = true;

    try {
      await fetch(`/api/games/${gameId}/start`, { method: 'POST' });
    } catch (e) {
      console.error('Start error:', e);
      startingRef.current = false;
      return;
    }

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      if (data?.status === 'in_progress' && !redirectingRef.current) {
        clearInterval(poll);
        redirectingRef.current = true;
        setLaunched(true);
        setTimeout(() => router.push(`/jeu?gameId=${gameId}`), 1500);
      }

      if (attempts >= 10) {
        clearInterval(poll);
        startingRef.current = false;
      }
    }, 1000);
  }

  // Countdown + auto-lancement
  useEffect(() => {
    if (players.length >= 10) { startGame(); return; }

    if (players.length >= MIN_PLAYERS) {
      if (!countdownStarted.current) {
        countdownStarted.current = true;
        setCountdown(COUNTDOWN_START);

        intervalRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
              startGame();
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    } else {
      countdownStarted.current = false;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setCountdown(COUNTDOWN_START);
    }

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  // Quitter la partie
  const handleQuit = async () => {
    if (!gameId || !currentUserId) { router.push('/match'); return; }

    // Supprime le joueur de la partie
    await supabase
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', currentUserId);

    // Vérifie s'il reste des joueurs
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    // Si plus personne, supprime la partie
    if (count === 0) {
      await supabase
        .from('games')
        .delete()
        .eq('id', gameId);
    }

    router.push('/match');
  };

  const hasMinPlayers = players.length >= MIN_PLAYERS;
  const progressPct   = countdown / COUNTDOWN_START;
  const barColor      = progressPct > 0.6 ? "#0aa36b" : progressPct > 0.3 ? "#ffd400" : "#ff2e2e";

  if (!gameId) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">
          Partie introuvable. <button onClick={() => router.push('/match')} className="underline text-[#ff2e2e]">Retour</button>
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-14">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">

        {/* ── Header ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none"
            style={{ fontSize: "52px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            EN ATTENTE DE BRAWLERS
          </h1>

          {/* Mode + durée */}
          {game && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <ModeBadge bg="#2e6bff" color="#fff">
                {MODE_LABELS[game.mode] ?? game.mode.toUpperCase()}
              </ModeBadge>
              <span className="font-bangers text-[#1a1a1a] text-2xl leading-none" aria-hidden="true">•</span>
              <ModeBadge bg="#ff2e2e" color="#ffd400">
                {DURATION_LABELS[game.duration_seconds] ?? `${game.duration_seconds}s`}
              </ModeBadge>
            </div>
          )}

          <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/60">
            {players.length} / {TOTAL_SLOTS} BRAWLERS
          </p>
        </div>

        {/* ── Player grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const player = players[i];
            return player ? (
              <PlayerSlot
                key={player.id}
                player={player}
                isMe={player.user_id === currentUserId}
              />
            ) : (
              <EmptySlot key={i} />
            );
          })}
        </div>

        {/* ── Timer ── */}
        {hasMinPlayers && (
          <div className="flex flex-col items-center gap-4">
            {launched ? (
              <p
                className="font-bangers uppercase tracking-widest text-[#ff2e2e] leading-none"
                style={{ fontSize: "48px", textShadow: "3px 3px 0 #1a1a1a" }}
              >
                BRAWL EN COURS !
              </p>
            ) : (
              <p
                className="font-bangers uppercase tracking-widest text-[#ff2e2e] leading-none tabular-nums"
                style={{ fontSize: "36px" }}
              >
                LANCEMENT DANS{" "}
                <span style={{ textShadow: "3px 3px 0 #1a1a1a" }}>{countdown}s</span>
              </p>
            )}

            <div
              className="w-full max-w-sm h-4 border-[3px] border-[#1a1a1a] overflow-hidden"
              style={{ borderRadius: "8px", backgroundColor: "#1a1a1a" }}
              role="progressbar"
              aria-valuenow={countdown}
              aria-valuemin={0}
              aria-valuemax={COUNTDOWN_START}
            >
              <div
                className="h-full transition-all duration-[900ms] ease-linear"
                style={{ width: `${progressPct * 100}%`, backgroundColor: barColor, borderRadius: "5px" }}
              />
            </div>
          </div>
        )}

        {!hasMinPlayers && (
          <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/45 text-center">
            En attente d&apos;au moins {MIN_PLAYERS} brawlers pour lancer la partie...
          </p>
        )}

        {/* ── Quit ── */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleQuit}
            className="font-archivo-black uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] px-10 py-3 transition-all duration-100 hover:-translate-y-[2px] active:translate-y-[3px]"
            style={{ borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a", fontSize: "15px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 7px 0 #1a1a1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 4px 0 #1a1a1a"; }}
            onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 1px 0 #1a1a1a"; }}
            onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 7px 0 #1a1a1a"; }}
          >
            QUITTER
          </button>
        </div>

      </div>
    </main>
  );
}

// ─── Player slot ──────────────────────────────────────────────────────────────

const FALLBACK_COLORS = ["#ff2e2e", "#2e6bff", "#0aa36b", "#c026d3", "#ff9500"];

function PlayerSlot({ player, isMe }: { player: GamePlayer; isMe: boolean }) {
  const u        = player.users;
  const pseudo   = u?.pseudo   || '???';
  const initials = pseudo.slice(0, 2).toUpperCase();
  const color    = u?.avatar_color || FALLBACK_COLORS[0];
  const elo      = u?.elo;
  const country  = u?.country;

  return (
    <div
      className="bg-white border-[5px] border-[#1a1a1a] rounded-[16px] p-4 flex flex-col items-center gap-2"
      style={{ boxShadow: isMe ? "4px 4px 0 #ff2e2e" : "4px 4px 0 #1a1a1a", borderColor: isMe ? "#ff2e2e" : "#1a1a1a" }}
    >
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full border-[4px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white text-lg shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>

      {/* Pseudo */}
      <p className="font-archivo-black text-[#1a1a1a] text-sm text-center leading-tight truncate w-full">
        {pseudo}
      </p>

      {isMe && (
        <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]">VOUS</span>
      )}

      {/* ELO */}
      {elo !== null && elo !== undefined && (
        <p className="font-archivo-black text-sm" style={{ color: "#0aa36b" }}>
          {elo} ELO
        </p>
      )}

      {/* Country */}
      {country && (
        <span
          className="font-archivo-black text-xs text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-2 py-0.5 uppercase"
          style={{ borderRadius: "6px", boxShadow: "2px 2px 0 #1a1a1a" }}
        >
          {country}
        </span>
      )}
    </div>
  );
}

// ─── Empty slot ───────────────────────────────────────────────────────────────

function EmptySlot() {
  return (
    <div
      className="border-[3px] border-dashed rounded-[16px] p-4 flex flex-col items-center gap-3"
      style={{ borderColor: "#b9a300", backgroundColor: "#fff7cc" }}
    >
      <div className="w-16 h-16 rounded-full border-[3px] border-dashed" style={{ borderColor: "#b9a300" }} />
      <p className="font-archivo text-sm italic text-center" style={{ color: "#b9a300", fontWeight: 500 }}>
        En attente...
      </p>
    </div>
  );
}

// ─── Mode badge ───────────────────────────────────────────────────────────────

function ModeBadge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span
      className="font-archivo-black text-sm uppercase tracking-widest px-4 py-1.5 border-[3px] border-[#1a1a1a]"
      style={{ backgroundColor: bg, color, borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a" }}
    >
      {children}
    </span>
  );
}
