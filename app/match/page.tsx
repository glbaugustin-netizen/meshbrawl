"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

// ─── Data ─────────────────────────────────────────────────────────────────────

type ModeId = "modelisation" | "texturing" | "animation" | "imaginaire";
type DurationId = "10min" | "1h" | "5h" | "1j" | "1sem";

const MODES: { id: ModeId; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "modelisation",
    label: "MODELISATION",
    description: "Reproduis un objet à partir d'un blueprint technique",
    icon: <IconBlueprint />,
  },
  {
    id: "texturing",
    label: "TEXTURING",
    description: "Texture un mesh imposé dans le style demandé",
    icon: <IconBrush />,
  },
  {
    id: "animation",
    label: "ANIMATION",
    description: "Anime un personnage rigué et rends une vidéo",
    icon: <IconPlay />,
  },
  {
    id: "imaginaire",
    label: "IMAGINAIRE",
    description: "Crée librement l'objet demandé à partir d'un prompt",
    icon: <IconBulb />,
  },
];

const DURATIONS: { id: DurationId; label: string; sub: string }[] = [
  { id: "10min", label: "10 MIN",    sub: "Speed run" },
  { id: "1h",    label: "1 HEURE",  sub: "Objet simple" },
  { id: "5h",    label: "5 HEURES", sub: "Objet détaillé" },
  { id: "1j",    label: "1 JOUR",   sub: "Scène complète" },
  { id: "1sem",  label: "1 SEMAINE",sub: "Chef d'oeuvre" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const durationMap: Record<string, number> = {
  '10 MIN':    600,
  '1 HEURE':   3600,
  '5 HEURES':  18000,
  '1 JOUR':    86400,
  '1 SEMAINE': 604800,
}

export default function MatchPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode]         = useState<ModeId | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationId | null>(null);
  const [searching, setSearching]               = useState(false);

  const canLaunch = selectedMode !== null && selectedDuration !== null;

  const hint = !selectedMode && !selectedDuration
    ? "Sélectionne un mode et une durée pour continuer"
    : !selectedMode
    ? "Sélectionne un mode de jeu"
    : "Sélectionne une durée";

  const handleLaunch = async () => {
    if (!canLaunch || searching) return;
    const dur = DURATIONS.find((d) => d.id === selectedDuration);
    if (!dur) return;
    setSearching(true);
    try {
      const res = await fetch('/api/games/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:             selectedMode,
          duration_seconds: durationMap[dur.label],
        }),
      });
      const { gameId, error } = await res.json();
      if (error || !gameId) { setSearching(false); return; }
      router.push(`/attente?gameId=${gameId}`);
    } catch {
      setSearching(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-14">
      <div className="max-w-4xl mx-auto flex flex-col gap-14">

        {/* ── Title ── */}
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-archivo-black text-sm uppercase tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-5 py-2 inline-block"
            style={{
              borderRadius: "8px",
              boxShadow: "3px 3px 0 #1a1a1a",
              transform: "rotate(-2deg)",
            }}
          >
            CHOISIS TON CAMP
          </span>

          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center leading-none"
            style={{ fontSize: "56px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            NOUVELLE PARTIE
          </h1>
        </div>

        {/* ── Section 1 — Mode ── */}
        <section className="flex flex-col gap-5">
          <SectionTitle separator>CHOISIS TON MODE</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODES.map((mode) => (
              <SelectableCard
                key={mode.id}
                selected={selectedMode === mode.id}
                onClick={() =>
                  setSelectedMode(selectedMode === mode.id ? null : mode.id)
                }
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 flex items-center justify-center shrink-0 border-[3px] border-[#1a1a1a]"
                    style={{
                      backgroundColor: "#ffd400",
                      borderRadius: "12px",
                      boxShadow: "3px 3px 0 #1a1a1a",
                    }}
                  >
                    {mode.icon}
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-archivo-black text-lg uppercase text-[#1a1a1a] leading-tight">
                      {mode.label}
                    </p>
                    <p
                      className="font-archivo text-sm text-[#1a1a1a]/65 leading-snug"
                      style={{ fontWeight: 600 }}
                    >
                      {mode.description}
                    </p>
                  </div>
                </div>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* ── Section 2 — Duration ── */}
        <section className="flex flex-col gap-5">
          <SectionTitle>CHOISIS TA DUREE</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {DURATIONS.map((dur) => (
              <SelectableCard
                key={dur.id}
                selected={selectedDuration === dur.id}
                onClick={() =>
                  setSelectedDuration(
                    selectedDuration === dur.id ? null : dur.id
                  )
                }
              >
                <p
                  className="font-bangers text-[#1a1a1a] leading-none tracking-wide"
                  style={{ fontSize: "32px" }}
                >
                  {dur.label}
                </p>
                <p
                  className="font-archivo text-xs text-[#1a1a1a]/65 mt-1.5 leading-snug"
                  style={{ fontWeight: 700 }}
                >
                  {dur.sub}
                </p>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <Button
            variant="primary"
            disabled={!canLaunch || searching}
            onClick={handleLaunch}
            className="!text-[40px] !px-16 !py-5 !rounded-[20px] !shadow-[0_12px_0_#1a1a1a] hover:!-translate-y-[4px] hover:!shadow-[0_16px_0_#1a1a1a] active:!shadow-[0_2px_0_#1a1a1a] disabled:!opacity-50 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_12px_0_#1a1a1a]"
          >
            {searching ? (
              <span className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-[3px] border-[#ffd400] border-t-transparent rounded-full animate-spin" />
                RECHERCHE EN COURS...
              </span>
            ) : (
              "LANCER LA RECHERCHE"
            )}
          </Button>

          {!canLaunch && (
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/45">
              {hint}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}

// ─── Selectable card ──────────────────────────────────────────────────────────

function SelectableCard({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left w-full bg-white border-[5px] rounded-[16px] p-6 cursor-pointer transition-all duration-100 hover:-translate-y-1 focus-visible:outline-none"
      style={{
        borderColor: selected ? "#ff2e2e" : "#1a1a1a",
        boxShadow: selected ? "6px 6px 0 #ff2e2e" : "6px 6px 0 #1a1a1a",
      }}
    >
      {/* CHOISI badge */}
      {selected && (
        <span
          className="absolute top-3 right-3 font-bangers text-xs tracking-widest text-white bg-[#ff2e2e] border-[2px] border-[#1a1a1a] px-2 py-0.5 uppercase"
          style={{ borderRadius: "6px", transform: "rotate(2deg)", boxShadow: "2px 2px 0 #1a1a1a" }}
        >
          CHOISI
        </span>
      )}

      {children}
    </button>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({
  children,
  separator = false,
}: {
  children: React.ReactNode;
  separator?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2
        className="font-archivo-black uppercase tracking-widest text-[#1a1a1a]"
        style={{ fontSize: "15px", letterSpacing: "0.12em" }}
      >
        {children}
      </h2>
      {separator && (
        <div className="h-[4px] w-full bg-[#1a1a1a] rounded-full" />
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBlueprint() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3"  y1="9"  x2="21" y2="9"  />
      <line x1="9"  y1="3"  x2="9"  y2="9"  />
      <line x1="7"  y1="13" x2="17" y2="13" />
      <line x1="7"  y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconBrush() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Palette body */}
      <path d="M12 2C6.48 2 2 6.48 2 12C2 15.8 4 19 7.2 20.7C7.6 20.9 8 21.4 8 22C8 22.6 8.4 23 9 23C9.5 23 10.3 22.8 10.8 22C11.3 21.2 12.2 20.8 13.2 20.8C17.9 20.5 22 16.7 22 12C22 6.48 17.52 2 12 2Z" />
      {/* Thumb hole */}
      <circle cx="8" cy="17" r="2" />
      {/* Paint blobs */}
      <circle cx="9"  cy="7.5" r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="13" cy="5.5" r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="17" cy="8"   r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="19" cy="13"  r="1.5" fill="#1a1a1a" stroke="none" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" fill="#1a1a1a" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21h6" />
      <path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.15-3 5.19V17H9v-2.81C7.2 13.15 6 11.22 6 9a6 6 0 0 1 6-6z" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
