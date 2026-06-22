"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockRendus = [
  {
    id: 1,
    auteur: "BlenderKing",
    fichier:
      "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  },
  {
    id: 2,
    auteur: "PolyWarrior",
    fichier:
      "https://modelviewer.dev/shared-assets/models/Horse.glb",
  },
  {
    id: 3,
    auteur: "MeshMaster",
    fichier:
      "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
  },
];

const VOTE_DURATION = 15;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VotePage() {
  const router = useRouter();

  const [rendusIndex, setRendusIndex] = useState(0);
  const [, setVotes] = useState<{ rendusId: number; vote: string }[]>([]);
  const [etoileUtilisee, setEtoileUtilisee] = useState(false);
  const [timer, setTimer] = useState(VOTE_DURATION);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasVotedRef = useRef(false);
  const rendusIndexRef = useRef(rendusIndex);
  rendusIndexRef.current = rendusIndex;

  // Load model-viewer CDN script once
  useEffect(() => {
    if (document.querySelector('script[src*="model-viewer"]')) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";
    document.head.appendChild(script);
  }, []);

  // Advance to next render or redirect
  const advance = useCallback(() => {
    const idx = rendusIndexRef.current;
    if (idx + 1 >= mockRendus.length) {
      router.push("/resultats");
    } else {
      setRendusIndex(idx + 1);
    }
  }, [router]);

  // Timer — resets on each new render
  useEffect(() => {
    setTimer(VOTE_DURATION);
    setFlashColor(null);
    hasVotedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [rendusIndex]);

  // Auto-advance when timer hits 0 (only if user hasn't voted)
  useEffect(() => {
    if (timer !== 0) return;
    const t = setTimeout(() => {
      if (!hasVotedRef.current) advance();
    }, 500);
    return () => clearTimeout(t);
  }, [timer, advance]);

  // Vote handler
  const handleVote = (type: "bien" | "mal" | "etoile") => {
    if (hasVotedRef.current) return;
    hasVotedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const rendu = mockRendus[rendusIndexRef.current];
    setVotes((v) => [...v, { rendusId: rendu.id, vote: type }]);
    if (type === "etoile") setEtoileUtilisee(true);

    const colors: Record<typeof type, string> = {
      bien: "#0aa36b44",
      mal: "#ff2e2e44",
      etoile: "#ffd40066",
    };
    setFlashColor(colors[type]);

    setTimeout(() => {
      setFlashColor(null);
      advance();
    }, 400);
  };

  const rendu = mockRendus[rendusIndex];
  const progressPct = ((rendusIndex + 1) / mockRendus.length) * 100;
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
              RENDU {rendusIndex + 1} SUR {mockRendus.length}
            </span>
            <span
              className="font-bangers tabular-nums transition-colors duration-300"
              style={{
                fontSize: "36px",
                color: isUrgent ? "#ff2e2e" : "#1a1a1a",
                lineHeight: 1,
              }}
            >
              {timer}s
            </span>
          </div>

          {/* Progress bar with hachures */}
          <div
            className="w-full h-6 border-[3px] border-[#1a1a1a] overflow-hidden"
            style={{ borderRadius: "8px", backgroundColor: "#e5d000" }}
          >
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background:
                  "repeating-linear-gradient(-45deg, #ff2e2e 0px, #ff2e2e 12px, #cc1111 12px, #cc1111 24px)",
              }}
            />
          </div>
        </div>

        {/* ── 3D Viewer ── */}
        <div className="relative" style={{ borderRadius: "16px" }}>
          <model-viewer
            key={rendu.id}
            src={rendu.fichier}
            alt={`Rendu de ${rendu.auteur}`}
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

          {/* Vote flash overlay */}
          {flashColor && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: "11px",
                backgroundColor: flashColor,
                transition: "opacity 0.2s ease-out",
              }}
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
          <VoteButton
            onClick={() => handleVote("bien")}
            bg="#0aa36b"
            color="#fff"
            shadow="#065c3d"
          >
            BIEN
          </VoteButton>

          <VoteButton
            onClick={() => handleVote("mal")}
            bg="#ff2e2e"
            color="#fff"
            shadow="#8b0000"
          >
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

      </div>
    </main>
  );
}

// ─── Vote button ──────────────────────────────────────────────────────────────

function VoteButton({
  children,
  onClick,
  bg,
  color,
  shadow,
  disabled = false,
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
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `4px 7px 0 ${shadow}`;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `4px 4px 0 ${shadow}`;
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(3px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `2px 1px 0 ${shadow}`;
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)";
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
