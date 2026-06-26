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
  isMine: boolean;
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
  const [timer,           setTimer]           = useState(VOTE_DURATION);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  const hasVotedMap    = useRef<Record<number, boolean>>({});
  const redirectedRef  = useRef(false);
  const advancedSlots  = useRef<Set<number>>(new Set());

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

        // Si la partie est déjà terminée, on va directement aux résultats.
        // (On ne se base PLUS sur "a déjà voté" : un joueur émet plusieurs
        // votes au fil de la partie et ne doit pas être éjecté après le 1er.)
        const { data: statusData } = await supabase
          .from('games')
          .select('status')
          .eq('id', gameId)
          .single();

        if (statusData?.status === 'finished') {
          router.push(`/resultats?gameId=${gameId}`);
          return;
        }

        // Charge TOUTES les soumissions de la partie, dans un ordre
        // déterministe partagé par tous les joueurs (tri par id). C'est ce
        // qui garantit que `currentIndex` désigne le même rendu pour tout
        // le monde — condition indispensable à la synchro du vote.
        const { data: players, error: err } = await supabase
          .from('game_players')
          .select('id, user_id, submission_url, submission_type')
          .eq('game_id', gameId)
          .eq('status', 'submitted')
          .order('id', { ascending: true });

        if (err) { setError(err.message); setLoading(false); return; }

        const list: Rendu[] = (players ?? []).map((p) => ({
          id:      p.id,
          auteur:  'ANONYME',
          fichier: p.submission_url ?? '',
          type:    (p.submission_type === 'video' ? 'video' : 'glb') as 'glb' | 'video',
          isMine:  p.user_id === user.id,
        }));

        setRendus(list);
        // Nombre total de joueurs ayant soumis. Un rendu est validé quand
        // tous les AUTRES joueurs ont voté dessus, soit (total - 1) votes.
        setTotalVoters(list.length);

        // Pré-remplit la map des votes déjà émis (utile après un refresh,
        // pour ne pas redonner un vote sur un rendu déjà voté). On marque
        // aussi son propre rendu comme "déjà traité".
        const { data: existingVotes } = await supabase
          .from('votes')
          .select('target_player_id')
          .eq('game_id', gameId)
          .eq('voter_id', user.id);

        list.forEach((r, idx) => {
          if (r.isMine) hasVotedMap.current[idx] = true;
        });
        (existingVotes ?? []).forEach((v) => {
          const idx = list.findIndex((r) => r.id === v.target_player_id);
          if (idx >= 0) hasVotedMap.current[idx] = true;
        });

        // Récupère ou crée voting_started_at (anti race condition)
        const { data: gameData } = await supabase
          .from('games')
          .select('voting_started_at')
          .eq('id', gameId)
          .single();

        let startedAt: number;

        if (gameData?.voting_started_at) {
          startedAt = new Date(gameData.voting_started_at).getTime();
        } else {
          // Attendre un délai aléatoire et re-vérifier avant de setter
          await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
          const { data: gameData2 } = await supabase
            .from('games')
            .select('voting_started_at')
            .eq('id', gameId)
            .single();

          if (gameData2?.voting_started_at) {
            startedAt = new Date(gameData2.voting_started_at).getTime();
          } else {
            const now = new Date().toISOString();
            await supabase
              .from('games')
              .update({ voting_started_at: now })
              .eq('id', gameId);
            startedAt = new Date(now).getTime();
          }
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

      if (elapsed < 0) return;

      const idx = Math.floor(elapsed / (VOTE_DURATION * 1000));

      if (idx >= rendus.length) {
        if (elapsed > VOTE_DURATION * 1000 * rendus.length && !redirectedRef.current) {
          redirectedRef.current = true;
          fetch(`/api/games/${gameId}/calculate-elo`, { method: 'POST' }).catch(() => {});
          router.push(`/resultats?gameId=${gameId}`);
        }
      } else {
        setCurrentIndex((prev) => {
          if (prev !== idx) setFlashColor(null);
          return idx;
        });
      }
    };

    calcIndex();
    const interval = setInterval(calcIndex, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingStartedAt, rendus.length, gameId, router]);

  // Met à jour le timer chaque 500ms
  useEffect(() => {
    if (!votingStartedAt || rendus.length === 0) return;

    const updateTimer = () => {
      const elapsed = Date.now() - votingStartedAt;
      if (elapsed < 0) { setTimer(VOTE_DURATION); return; }
      const timeInSlot = elapsed % (VOTE_DURATION * 1000);
      const remaining = Math.max(0, VOTE_DURATION - Math.floor(timeInSlot / 1000));
      setTimer(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [votingStartedAt, rendus.length]);

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

      // On avance seulement quand TOUS les autres joueurs ont voté ce rendu,
      // c.-à-d. (total des soumissions - 1) votes (l'auteur ne vote pas).
      // Guards : ce slot n'a pas déjà été avancé par ce client,
      //          et le slot dure au minimum 8 s (laisse le temps aux joueurs lents de charger).
      if (count !== null && totalVoters > 1 && count >= totalVoters - 1) {
        if (advancedSlots.current.has(currentIndex)) return;
        const slotStart = votingStartedAt + currentIndex * VOTE_DURATION * 1000;
        if (Date.now() - slotStart < 8000) return;
        advancedSlots.current.add(currentIndex);
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
    const rendu = rendus[currentIndex];
    if (!rendu || rendu.isMine) return; // on ne vote jamais pour son propre rendu
    if (hasVotedMap.current[currentIndex] || !currentUserId || !gameId) return;
    hasVotedMap.current[currentIndex] = true;

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
  const isUrgent    = timer <= 10;

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

        {/* ── Vote buttons (ou état d'attente si c'est ton rendu) ── */}
        {rendu.isMine ? (
          <div
            className="flex flex-col items-center justify-center gap-2 border-[4px] border-[#1a1a1a] py-6 px-4 text-center"
            style={{ borderRadius: "14px", backgroundColor: "#fff7cc", boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            <p className="font-bangers uppercase tracking-widest text-[#1a1a1a]" style={{ fontSize: "28px", lineHeight: 1 }}>
              C&apos;EST TON RENDU !
            </p>
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/60">
              En attente des votes des autres brawlers...
            </p>
          </div>
        ) : (
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
        )}

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
