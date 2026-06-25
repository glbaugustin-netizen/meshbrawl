"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GameChat from "@/components/GameChat";

// ─── model-viewer type declaration ────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        "auto-rotate"?: boolean;
        "camera-controls"?: boolean;
        "shadow-intensity"?: string;
        style?: React.CSSProperties;
        className?: string;
      };
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rendu {
  id:     string;
  auteur: string;
  fichier: string;
  type:   'glb' | 'video';
}

const VOTE_DURATION = 60;

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function VotePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <VotePageInner />
    </Suspense>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function VotePageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const gameId       = searchParams.get('gameId');
  const supabase     = createClient();

  const [rendus,          setRendus]          = useState<Rendu[]>([]);
  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null);
  const [currentPseudo,   setCurrentPseudo]   = useState('');
  const [votingStartedAt, setVotingStartedAt] = useState<number | null>(null);
  const [currentIndex,    setCurrentIndex]    = useState(0);
  const [totalVoters,     setTotalVoters]     = useState(0);
  const [etoileUtilisee,  setEtoileUtilisee]  = useState(false);
  const [flashColor,      setFlashColor]      = useState<string | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  const hasVotedMap   = useRef<Record<number, boolean>>({});
  const redirectedRef = useRef(false);

  // Load model-viewer CDN script once
  useEffect(() => {
    if (document.querySelector('script[src*="model-viewer"]')) return;
    const script = document.createElement("script");
    script.type  = "module";
    script.src   = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";
    document.head.appendChild(script);
  }, []);

  // Charge user + soumissions + votes existants
  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Non connecté'); setLoading(false); return; }
        setCurrentUserId(user.id);

        const { data: pseudoData } = await supabase
          .from('users')
          .select('pseudo')
          .eq('id', user.id)
          .single();
        if (pseudoData) setCurrentPseudo(pseudoData.pseudo);

        // Vérifie si l'utilisateur a déjà voté
        const { data: existingVotes } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('game_id', gameId)
          .eq('voter_id', user.id);

        if (existingVotes && existingVotes.length > 0) {
          router.push(`/resultats?gameId=${gameId}`);
          return;
        }

        // Charge les soumissions (pas la sienne)
        const { data: players, error: err } = await supabase
          .from('game_players')
          .select('id, user_id, submission_url, submission_type')
          .eq('game_id', gameId)
          .eq('status', 'submitted')
          .neq('user_id', user.id);

        if (err) { setError(err.message); setLoading(false); return; }

        const list: Rendu[] = (players ?? []).map((p) => ({
          id:      p.id,
          auteur:  'ANONYME',
          fichier: p.submission_url ?? '',
          type:    (p.submission_type === 'video' ? 'video' : 'glb') as 'glb' | 'video',
        }));

        setRendus(list);
        // Nombre de voters = nombre de soumissions (chaque joueur vote pour les autres)
        setTotalVoters((players ?? []).length);

        // Récupère ou crée voting_started_at
        const { data: gameData } = await supabase
          .from('games')
          .select('voting_started_at')
          .eq('id', gameId)
          .single();

        let startedAt: number;

        if (gameData?.voting_started_at) {
          startedAt = new Date(gameData.voting_started_at).getTime();
        } else {
          const now = new Date().toISOString();
          await supabase
            .from('games')
            .update({ voting_started_at: now })
            .eq('id', gameId);
          startedAt = new Date(now).getTime();
        }

        setVotingStartedAt(startedAt);
      } catch (e) {
        console.error(e);
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Calcule l'index courant basé sur voting_started_at
  useEffect(() => {
    if (!votingStartedAt || rendus.length === 0) return;

    const calcIndex = () => {
      const elapsed = Date.now() - votingStartedAt;
      const idx = Math.floor(elapsed / (VOTE_DURATION * 1000));
      if (idx >= rendus.length) {
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          fetch(`/api/games/${gameId}/calculate-elo`, { method: 'POST' }).catch(() => {});
          router.push(`/resultats?gameId=${gameId}`);
        }
      } else {
        setCurrentIndex(idx);
      }
    };

    calcIndex();
    const interval = setInterval(calcIndex, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingStartedAt, rendus.length, gameId, router]);

  // Avance si tous ont voté sur le rendu courant
  useEffect(() => {
    if (!gameId || !votingStartedAt || rendus.length === 0) return;

    const checkAllVoted = async () => {
      const rendu = rendus[currentIndex];
      if (!rendu) return;

      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)
        .eq('target_player_id', rendu.id);

      if (count !== null && totalVoters > 0 && count >= totalVoters - 1) {
        const newStartedAt = Date.now() - ((currentIndex + 1) * VOTE_DURATION * 1000);
        await supabase
          .from('games')
          .update({ voting_started_at: new Date(newStartedAt).toISOString() })
          .eq('id', gameId);
        setVotingStartedAt(newStartedAt);
      }
    };

    const interval = setInterval(checkAllVoted, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, currentIndex, votingStartedAt, rendus, totalVoters, supabase]);

  // Vote handler
  const handleVote = async (type: "bien" | "mal" | "etoile") => {
    if (hasVotedMap.current[currentIndex] || !currentUserId || !gameId) return;
    hasVotedMap.current[currentIndex] = true;

    const rendu = rendus[currentIndex];

    // Insère le vote en DB
    const { error: voteErr } = await supabase.from('votes').insert({
      game_id:          gameId,
      voter_id:         currentUserId,
      target_player_id: rendu.id,
      vote_type:        type,
    });
    if (voteErr) console.error('Erreur vote:', voteErr.message);

    if (type === 'etoile') setEtoileUtilisee(true);

    const colors: Record<typeof type, string> = {
      bien:   "#0aa36b44",
      mal:    "#ff2e2e44",
      etoile: "#ffd40066",
    };
    setFlashColor(colors[type]);
    setTimeout(() => setFlashColor(null), 400);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-bangers uppercase tracking-widest text-[#ff2e2e]" style={{ fontSize: "36px" }}>
            ERREUR
          </p>
          <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/60">
            {error}
          </p>
          <button
            type="button"
            onClick={() => router.push('/match')}
            className="font-archivo-black uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] px-8 py-3 mt-2"
            style={{ borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a", fontSize: "14px" }}
          >
            RETOUR
          </button>
        </div>
      </main>
    );
  }

  if (!gameId || rendus.length === 0) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-bangers uppercase tracking-widest text-[#1a1a1a]" style={{ fontSize: "36px", textShadow: "3px 3px 0 #ff2e2e" }}>
            AUCUN RENDU A VOTER
          </p>
          <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/50">
            Aucune soumission disponible pour cette partie.
          </p>
          <button
            type="button"
            onClick={() => router.push('/match')}
            className="font-archivo-black uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] px-8 py-3 mt-2"
            style={{ borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a", fontSize: "14px" }}
          >
            RETOUR
          </button>
        </div>
      </main>
    );
  }

  const rendu       = rendus[currentIndex];
  const progressPct = rendus.length > 0 ? ((currentIndex + 1) / rendus.length) * 100 : 0;
  const timeInCurrentSlot = votingStartedAt
    ? Math.floor((Date.now() - votingStartedAt) % (VOTE_DURATION * 1000) / 1000)
    : 0;
  const timer    = VOTE_DURATION - timeInCurrentSlot;
  const isUrgent = timer <= 5;

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* ── Title ── */}
        <div className="text-center">
          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none"
            style={{ fontSize: "52px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            PLACE AU VOTE
          </h1>
        </div>

        {/* ── Progress + Timer ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]">
              RENDU {currentIndex + 1} SUR {rendus.length}
            </span>
            <span
              className="font-bangers tabular-nums transition-colors duration-300"
              style={{ fontSize: "36px", color: isUrgent ? "#ff2e2e" : "#1a1a1a", lineHeight: 1 }}
            >
              {timer}s
            </span>
          </div>

          <div
            className="w-full h-6 border-[3px] border-[#1a1a1a] overflow-hidden"
            style={{ borderRadius: "8px", backgroundColor: "#e5d000" }}
          >
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "repeating-linear-gradient(-45deg, #ff2e2e 0px, #ff2e2e 12px, #cc1111 12px, #cc1111 24px)",
              }}
            />
          </div>
        </div>

        {/* ── Viewer ── */}
        <div className="relative" style={{ borderRadius: "16px" }}>
          {rendu.type === 'video' ? (
            <video
              key={rendu.id}
              src={rendu.fichier}
              controls
              autoPlay
              style={{
                width: "100%",
                height: "500px",
                objectFit: "contain",
                backgroundColor: "#000",
                border: "5px solid #1a1a1a",
                borderRadius: "16px",
                boxShadow: "6px 6px 0 #1a1a1a",
                display: "block",
              }}
            />
          ) : (
            <model-viewer
              key={rendu.id}
              src={rendu.fichier}
              alt="Rendu anonyme"
              auto-rotate
              camera-controls
              shadow-intensity="1"
              style={{
                width: "100%",
                height: "500px",
                backgroundColor: "#ffffff",
                border: "5px solid #1a1a1a",
                borderRadius: "16px",
                boxShadow: "6px 6px 0 #1a1a1a",
                display: "block",
              }}
            />
          )}

          {/* Vote flash overlay */}
          {flashColor && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: "11px", backgroundColor: flashColor, transition: "opacity 0.2s ease-out" }}
            />
          )}

          {/* Anonymous label */}
          <div
            className="absolute top-3 left-3 font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[3px] border-[#1a1a1a] px-3 py-1"
            style={{ borderRadius: "8px", boxShadow: "2px 2px 0 #1a1a1a" }}
          >
            ANONYME
          </div>
        </div>

        {/* ── Vote buttons ── */}
        <div className="grid grid-cols-3 gap-4">
          <VoteButton onClick={() => handleVote("bien")} bg="#0aa36b" color="#fff" shadow="#065c3d">
            BIEN
          </VoteButton>

          <VoteButton onClick={() => handleVote("mal")} bg="#ff2e2e" color="#fff" shadow="#8b0000">
            MAL
          </VoteButton>

          <VoteButton
            onClick={() => handleVote("etoile")}
            bg={etoileUtilisee ? "#cccccc" : "#ffd400"}
            color={etoileUtilisee ? "#999" : "#1a1a1a"}
            shadow={etoileUtilisee ? "#999" : "#7a6300"}
            disabled={etoileUtilisee}
          >
            <span className="flex flex-col items-center gap-1">
              <IconStar disabled={etoileUtilisee} />
              <span style={{ fontSize: "16px", lineHeight: 1 }}>
                {etoileUtilisee ? "UTILISEE" : "MON PREFERE"}
              </span>
            </span>
          </VoteButton>
        </div>

        {/* ── Hint ── */}
        <p
          className="text-center font-archivo text-xs text-[#1a1a1a]/50 uppercase tracking-widest"
          style={{ fontWeight: 600 }}
        >
          L&apos;auteur sera révélé après les votes • L&apos;étoile ne peut être donnée qu&apos;une seule fois
        </p>

        {gameId && currentUserId && currentPseudo && (
          <div className="mt-6">
            <GameChat
              gameId={gameId}
              currentUserId={currentUserId}
              currentPseudo={currentPseudo}
            />
          </div>
        )}

      </div>
    </main>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <main
      className="min-h-[calc(100vh-64px)] flex items-center justify-center"
      style={{
        background: "radial-gradient(circle, #ffd400 1px, transparent 1px) 0 0 / 28px 28px",
        backgroundColor: "#fffbe6",
      }}
    >
      <p
        className="font-bangers uppercase tracking-widest text-[#1a1a1a]"
        style={{ fontSize: "52px", textShadow: "4px 4px 0 #ff2e2e" }}
      >
        CHARGEMENT...
      </p>
    </main>
  );
}

// ─── Vote button ──────────────────────────────────────────────────────────────

function VoteButton({
  children, onClick, bg, color, shadow, disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  bg: string;
  color: string;
  shadow: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className="font-bangers uppercase tracking-widest transition-all duration-100 border-[4px] border-[#1a1a1a] rounded-[14px] py-4 flex items-center justify-center"
      style={{
        backgroundColor: bg,
        color,
        fontSize: "28px",
        lineHeight: 1,
        boxShadow: `4px 4px 0 ${shadow}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform  = "translateY(-3px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `4px 7px 0 ${shadow}`;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform  = "";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `4px 4px 0 ${shadow}`;
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform  = "translateY(3px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `2px 1px 0 ${shadow}`;
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform  = "translateY(-3px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `4px 7px 0 ${shadow}`;
      }}
    >
      {children}
    </button>
  );
}

// ─── Star icon ────────────────────────────────────────────────────────────────

function IconStar({ disabled }: { disabled: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={disabled ? "#aaa" : "#1a1a1a"}
      stroke={disabled ? "#aaa" : "#1a1a1a"}
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
