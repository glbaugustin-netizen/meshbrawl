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
  const [etoileUtilisee,  setEtoileUtilisee]  = useState(false);
  const [flashColor,      setFlashColor]      = useState<string | null>(null);
  const [timer,           setTimer]           = useState(VOTE_DURATION);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  const hasVotedMap   = useRef<Record<number, boolean>>({});
  const redirectedRef = useRef(false);
  // Décalage entre l'horloge serveur et l'horloge locale (serverNow - Date.now()).
  // Permet de comparer voting_started_at (timestamp serveur) à une "heure locale
  // corrigée", éliminant les écarts d'horloge entre les différents PC.
  const clockOffsetRef = useRef(0);
  // Complétions anticipées : target_player_id (= rendu.id) → completed_at (ms
  // serveur). Quand tous ont voté pour un rendu, le serveur stampe l'heure ; la
  // timeline coupe alors ce slot à completed_at + 3s (synchronisé entre clients).
  const completionsRef = useRef<Record<string, number>>({});

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

        // Charge toutes les soumissions via une route serveur (service role).
        // Cette route est AUTORITAIRE : elle attend que tous aient soumis, démarre
        // la phase de vote (voting_started_at) côté serveur, et renvoie tout en
        // millisecondes epoch — donc aucune ambiguïté de fuseau horaire possible.
        // On boucle (max 60 × 2s) jusqu'à ce que voting_started_at soit défini.
        type RawPlayer = { id: string; user_id: string; submission_url: string | null; submission_type: string | null };
        type SubsResp  = {
          submissions: RawPlayer[];
          totalPlayers: number;
          votingStartedAt: number | null;
          serverNow: number;
          status: string;
          completions?: { targetPlayerId: string; completedAt: number }[];
          noSubmissions?: boolean;
        };

        let list: Rendu[] = [];
        let startedAt: number | null = null;

        for (let attempt = 0; attempt < 60; attempt++) {
          const submissionsRes = await fetch(`/api/games/${gameId}/submissions`);
          if (!submissionsRes.ok) {
            setError('Impossible de charger les soumissions');
            setLoading(false);
            return;
          }
          const data = (await submissionsRes.json()) as SubsResp;

          // Corrige le décalage d'horloge local ↔ serveur à chaque réponse
          clockOffsetRef.current = data.serverNow - Date.now();

          // Capture les complétions déjà connues (utile après un refresh)
          if (Array.isArray(data.completions)) {
            const map: Record<string, number> = {};
            for (const c of data.completions) map[c.targetPlayerId] = c.completedAt;
            completionsRef.current = map;
          }

          // Partie déjà terminée → résultats
          if (data.status === 'finished') {
            router.push(`/resultats?gameId=${gameId}`);
            return;
          }

          // Temps écoulé et personne n'a soumis → directement aux résultats.
          // calculate-elo appliquera la pénalité de non-soumission (-50) à tous.
          if (data.noSubmissions) {
            router.push(`/resultats?gameId=${gameId}`);
            return;
          }

          list = (data.submissions ?? []).map((p) => ({
            id:      p.id,
            auteur:  'ANONYME',
            fichier: p.submission_url ?? '',
            type:    (p.submission_type === 'video' ? 'video' : 'glb') as 'glb' | 'video',
            isMine:  p.user_id === user.id,
          }));

          // La phase de vote a démarré côté serveur → on tient le timestamp
          if (data.votingStartedAt !== null) {
            startedAt = data.votingStartedAt;
            break;
          }
          // Sinon on attend 2s et on réessaie
          await new Promise((r) => setTimeout(r, 2000));
        }

        setRendus(list);

        // Pré-remplit la map des votes déjà émis (après un refresh) + son propre rendu.
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

        if (startedAt !== null) setVotingStartedAt(startedAt);
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

  // Timeline de vote synchronisée (index + chrono en un seul calcul).
  // Chaque rendu a un slot de VOTE_DURATION s, MAIS un slot peut se terminer en
  // avance : quand tous ont voté avec > 5s restantes, le slot coupe à
  // completed_at + 3s, décalant d'autant les slots suivants. Tous les clients
  // partagent voting_started_at ET les completed_at (heure serveur) → calcul
  // identique partout, aucune décision locale qui désyncroniserait.
  // Sans complétion, on retombe EXACTEMENT sur l'ancienne timeline.
  useEffect(() => {
    if (!votingStartedAt || rendus.length === 0) return;

    const tick = () => {
      const nowC = Date.now() + clockOffsetRef.current;

      // Avant le départ → premier slot, chrono plein
      if (nowC < votingStartedAt) {
        setCurrentIndex(0);
        setTimer(VOTE_DURATION);
        return;
      }

      let slotStart = votingStartedAt;
      for (let i = 0; i < rendus.length; i++) {
        const nominalEnd = slotStart + VOTE_DURATION * 1000;
        let actualEnd = nominalEnd;

        const comp = completionsRef.current[rendus[i].id];
        if (comp != null && nominalEnd - comp > 5000) {
          // Tous ont voté avec > 5s restantes → on coupe à completed_at + 3s
          actualEnd = Math.min(nominalEnd, comp + 3000);
        }

        if (nowC < actualEnd) {
          setCurrentIndex((prev) => { if (prev !== i) setFlashColor(null); return i; });
          setTimer(Math.max(0, Math.ceil((actualEnd - nowC) / 1000)));
          return;
        }
        slotStart = actualEnd;
      }

      // Toutes les fenêtres écoulées → résultats. C'est /resultats qui déclenche
      // calculate-elo (protégé côté serveur).
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.push(`/resultats?gameId=${gameId}`);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingStartedAt, rendus.length, gameId, router]);

  // Poll des complétions + resync horloge pendant toute la phase de vote.
  useEffect(() => {
    if (!votingStartedAt || !gameId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/submissions`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        if (typeof data.serverNow === 'number') {
          clockOffsetRef.current = data.serverNow - Date.now();
        }
        if (Array.isArray(data.completions)) {
          const map: Record<string, number> = {};
          for (const c of data.completions) map[c.targetPlayerId] = c.completedAt;
          completionsRef.current = map;
        }
        if (data.status === 'finished' && !redirectedRef.current) {
          redirectedRef.current = true;
          router.push(`/resultats?gameId=${gameId}`);
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingStartedAt, gameId, router]);

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
  const progressPct = ((VOTE_DURATION - timer) / VOTE_DURATION) * 100;
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
              <IconThumbUp />
            </VoteButton>

            <VoteButton onClick={() => handleVote("mal")} bg="#ff2e2e" color="#fff" shadow="#8b0000">
              <IconThumbDown />
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
          <GameChat
            gameId={gameId}
            currentUserId={currentUserId}
            currentPseudo={currentPseudo}
          />
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

function IconThumbUp() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
      strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconThumbDown() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
      strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

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
