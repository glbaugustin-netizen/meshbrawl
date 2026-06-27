"use client";

import { useState } from "react";
import Button from "@/components/Button";

// ─── Static data ──────────────────────────────────────────────────────────────

type ModeId = "modelisation" | "texturing" | "animation" | "imaginaire";
type DurationId = "30min" | "1h" | "5h" | "1j" | "1sem";

const MODES: { id: ModeId; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "modelisation",
    label: "MODELISATION",
    description: "Reproduis un objet à partir d'un blueprint",
    icon: <IconBlueprint />,
  },
  {
    id: "texturing",
    label: "TEXTURING",
    description: "Texture un mesh imposé dans un style donné",
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
    description: "Crée librement l'objet demandé",
    icon: <IconBulb />,
  },
];

const DURATIONS: { id: DurationId; label: string; sub: string }[] = [
  { id: "30min", label: "30 MIN", sub: "Pour les speed runners" },
  { id: "1h", label: "1 HEURE", sub: "Un objet simple, vite fait" },
  { id: "5h", label: "5 HEURES", sub: "Place au détail" },
  { id: "1j", label: "1 JOUR", sub: "Prends ton temps" },
  { id: "1sem", label: "1 SEMAINE", sub: "Montre tout ton niveau" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JouerPage() {
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationId | null>(null);

  const canLaunch = selectedMode !== null && selectedDuration !== null;

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-16">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">

        {/* ── Page title ── */}
        <div className="flex flex-col items-center gap-3">
          <span
            className="font-archivo-black text-xs uppercase tracking-widest bg-white border-[3px] border-[#1a1a1a] px-5 py-2 inline-block"
            style={{ boxShadow: "3px 3px 0 #1a1a1a", borderRadius: "8px", transform: "rotate(-1.5deg)" }}
          >
            ARENE DE MODELISATION 3D
          </span>
          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none text-center"
            style={{ fontSize: "56px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            NOUVELLE PARTIE
          </h1>
        </div>

        {/* ── Mode section ── */}
        <section className="flex flex-col gap-5">
          <SectionTitle>CHOISIS TON MODE</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODES.map((mode) => (
              <SelectableCard
                key={mode.id}
                selected={selectedMode === mode.id}
                onClick={() =>
                  setSelectedMode(selectedMode === mode.id ? null : mode.id)
                }
              >
                <div className="w-14 h-14 flex items-center justify-center border-[3px] border-[#1a1a1a] bg-[#ffd400] mb-4"
                  style={{ borderRadius: "12px", boxShadow: "3px 3px 0 #1a1a1a" }}>
                  {mode.icon}
                </div>
                <p className="font-archivo-black text-lg uppercase text-[#1a1a1a] leading-tight">
                  {mode.label}
                </p>
                <p className="font-archivo text-sm text-[#1a1a1a]/65 mt-1 leading-snug" style={{ fontWeight: 600 }}>
                  {mode.description}
                </p>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* ── Duration section ── */}
        <section className="flex flex-col gap-5">
          <SectionTitle>CHOISIS TA DUREE</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <p className="font-bangers text-3xl text-[#1a1a1a] leading-none tracking-wide">
                  {dur.label}
                </p>
                <p className="font-archivo text-xs text-[#1a1a1a]/65 mt-2 leading-snug" style={{ fontWeight: 600 }}>
                  {dur.sub}
                </p>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="flex flex-col items-center gap-4">
          <Button
            variant="primary"
            disabled={!canLaunch}
            className="!text-4xl !px-16 !py-4 !rounded-[20px] !shadow-[0_10px_0_#1a1a1a] hover:!shadow-[0_14px_0_#1a1a1a] hover:!-translate-y-[4px] active:!shadow-[0_2px_0_#1a1a1a] disabled:!opacity-40 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_10px_0_#1a1a1a]"
          >
            LANCER LA RECHERCHE
          </Button>
          {!canLaunch && (
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/50">
              {!selectedMode && !selectedDuration
                ? "Choisis un mode et une durée"
                : !selectedMode
                ? "Choisis un mode de jeu"
                : "Choisis une durée"}
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
      className="relative text-left w-full bg-white border-[5px] border-[#1a1a1a] rounded-[16px] p-6 cursor-pointer transition-transform duration-100 hover:-translate-y-1 focus-visible:outline-none"
      style={{
        boxShadow: selected
          ? "6px 6px 0 #ff2e2e"
          : "6px 6px 0 #1a1a1a",
        outline: selected ? "none" : undefined,
      }}
    >
      {/* Selected ring */}
      {selected && (
        <span
          className="absolute inset-0 rounded-[11px] pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 4px #ff2e2e" }}
        />
      )}

      {/* "CHOISI" badge */}
      {selected && (
        <span
          className="absolute top-3 right-3 font-bangers text-xs tracking-widest text-white bg-[#ff2e2e] border-[2px] border-[#1a1a1a] px-2 py-0.5 uppercase"
          style={{ borderRadius: "6px", transform: "rotate(2deg)" }}
        >
          CHOISI
        </span>
      )}

      {children}
    </button>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-archivo-black text-xl uppercase text-[#1a1a1a] tracking-widest"
      style={{ borderLeft: "5px solid #ff2e2e", paddingLeft: "14px" }}
    >
      {children}
    </h2>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBlueprint() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="3" x2="9" y2="9" />
      <line x1="7" y1="13" x2="17" y2="13" />
      <line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconBrush() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 15.8 4 19 7.2 20.7C7.6 20.9 8 21.4 8 22C8 22.6 8.4 23 9 23C9.5 23 10.3 22.8 10.8 22C11.3 21.2 12.2 20.8 13.2 20.8C17.9 20.5 22 16.7 22 12C22 6.48 17.52 2 12 2Z" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="9"  cy="7.5" r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="13" cy="5.5" r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="17" cy="8"   r="1.5" fill="#1a1a1a" stroke="none" />
      <circle cx="19" cy="13"  r="1.5" fill="#1a1a1a" stroke="none" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" fill="#1a1a1a" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21h6" />
      <path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.15-3 5.19V17H9v-2.81C7.2 13.15 6 11.22 6 9a6 6 0 0 1 6-6z" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
