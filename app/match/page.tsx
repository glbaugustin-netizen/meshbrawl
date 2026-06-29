"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";

// ─── Data ─────────────────────────────────────────────────────────────────────

type ModeId = "modelisation" | "texturing" | "animation" | "imaginaire";
type DurationId = "30min" | "1h" | "5h" | "1j" | "1sem";

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
  { id: "30min", label: "30 MIN",    sub: "Speed run" },
  { id: "1h",    label: "1 HEURE",  sub: "Objet simple" },
  { id: "5h",    label: "5 HEURES", sub: "Objet détaillé" },
  { id: "1j",    label: "1 JOUR",   sub: "Scène complète" },
  { id: "1sem",  label: "1 SEMAINE",sub: "Chef d'oeuvre" },
];

const BLOCKED_DURATIONS: Partial<Record<ModeId, DurationId[]>> = {
  modelisation: ["30min", "1h", "1sem"],
  texturing:    ["1sem"],
  animation:    ["1j", "1sem"],
  imaginaire:   ["5h", "1sem"],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const durationMap: Record<string, number> = {
  '30 MIN':    1800,
  '1 HEURE':   3600,
  '5 HEURES':  18000,
  '1 JOUR':    86400,
  '1 SEMAINE': 604800,
}

export default function MatchPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [selectedMode, setSelectedMode]         = useState<ModeId | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationId | null>(null);
  const [searching, setSearching]               = useState(false);
  const [noElo, setNoElo]                       = useState(false);
  const [animWarning, setAnimWarning]           = useState(false);
  const [dontRemind, setDontRemind]             = useState(false);
  const [pendingAnimMode, setPendingAnimMode]   = useState<ModeId | null>(null);

  const blockedDurations: DurationId[] = selectedMode
    ? (BLOCKED_DURATIONS[selectedMode] ?? [])
    : [];

  const handleModeSelect = (modeId: ModeId) => {
    const newMode = selectedMode === modeId ? null : modeId;

    // Avertissement PC pour le mode animation (sauf si l'utilisateur a coché "ne plus afficher")
    if (newMode === 'animation' && typeof window !== 'undefined' && !localStorage.getItem('anim_warning_dismissed')) {
      setPendingAnimMode(newMode);
      setDontRemind(false);
      setAnimWarning(true);
      return;
    }

    setSelectedMode(newMode);
    if (newMode && selectedDuration && (BLOCKED_DURATIONS[newMode] ?? []).includes(selectedDuration)) {
      setSelectedDuration(null);
    }
  };

  const confirmAnimWarning = () => {
    if (dontRemind && typeof window !== 'undefined') {
      localStorage.setItem('anim_warning_dismissed', '1');
    }
    setAnimWarning(false);
    const newMode = pendingAnimMode;
    setSelectedMode(newMode);
    if (newMode && selectedDuration && (BLOCKED_DURATIONS[newMode] ?? []).includes(selectedDuration)) {
      setSelectedDuration(null);
    }
    setPendingAnimMode(null);
  };

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
          ranked:           !noElo,
        }),
      });
      const { gameId, error } = await res.json();
      if (error || !gameId) {
        if (res.status === 403) alert("Ton compte a été banni. Tu ne peux plus rejoindre de partie.");
        setSearching(false);
        return;
      }
      router.push(`/attente?gameId=${gameId}`);
    } catch {
      setSearching(false);
    }
  };

  if (isMobile) {
    return (
      <main className="min-h-[calc(100vh-64px)] px-4 py-14 flex items-center justify-center">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-8 text-center">

          <span
            className="font-archivo-black text-sm uppercase tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-5 py-2 inline-block"
            style={{ borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a", transform: "rotate(-2deg)" }}
          >
            DESKTOP UNIQUEMENT
          </span>

          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none"
            style={{ fontSize: "48px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            PAS SI VITE !
          </h1>

          <div
            className="bg-white border-[5px] border-[#1a1a1a] rounded-[16px] p-6 text-left"
            style={{ boxShadow: "6px 6px 0 #1a1a1a" }}
          >
            <p className="font-archivo text-[#1a1a1a] text-base leading-relaxed" style={{ fontWeight: 700 }}>
              MeshBrawl nécessite un logiciel de modélisation 3D comme Blender, Cinema 4D ou Maya.
              Le jeu n&apos;est pas disponible sur mobile — reviens sur ordinateur pour brawler !
            </p>
          </div>

          <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/50">
            En attendant, suis-nous :
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            {[
              { label: "Discord",    href: "#", icon: <IconDiscord /> },
              { label: "TikTok",    href: "#", icon: <IconTikTok /> },
              { label: "Instagram", href: "#", icon: <IconInstagram /> },
              { label: "YouTube",   href: "#", icon: <IconYouTube /> },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 flex items-center justify-center bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#ffd400] transition-colors duration-150"
                style={{ boxShadow: "3px 3px 0 #1a1a1a", borderRadius: "10px" }}
              >
                {social.icon}
              </a>
            ))}
          </div>

          <Link
            href="/"
            className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2 hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            RETOUR ACCUEIL
          </Link>

        </div>
      </main>
    );
  }

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
                onClick={() => handleModeSelect(mode.id)}
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
          <SectionTitle separator>CHOISIS TA DUREE</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {DURATIONS.map((dur) => {
              const isDisabled = blockedDurations.includes(dur.id);
              return (
                <SelectableCard
                  key={dur.id}
                  selected={selectedDuration === dur.id}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelectedDuration(selectedDuration === dur.id ? null : dur.id)}
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
                  {isDisabled && (
                    <p className="font-archivo-black text-[9px] uppercase tracking-widest text-[#ff2e2e] mt-2">
                      INDISPONIBLE
                    </p>
                  )}
                </SelectableCard>
              );
            })}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="flex flex-col items-center gap-3 pb-4">
          {/* Partie amicale — sans ELO */}
          <button
            type="button"
            onClick={() => setNoElo((v) => !v)}
            className="flex items-center gap-3 bg-white px-5 py-3 transition-all duration-100 hover:-translate-y-[2px]"
            style={{ border: "3px solid #1a1a1a", borderRadius: "12px", boxShadow: "3px 3px 0 #1a1a1a" }}
          >
            <span
              className="flex items-center justify-center shrink-0 transition-colors duration-100"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "7px",
                border: "3px solid #1a1a1a",
                backgroundColor: noElo ? "#0aa36b" : "#fff",
              }}
            >
              {noElo && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]">
                Partie amicale
              </span>
              <span className="font-archivo text-[11px] text-[#1a1a1a]/55" style={{ fontWeight: 600 }}>
                Aucun ELO en jeu — file séparée
              </span>
            </span>
          </button>

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

      {/* ── Modal avertissement Animation ── */}
      {animWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(26,26,26,0.7)" }}
        >
          <div
            className="w-full max-w-sm flex flex-col gap-5 p-6"
            style={{ backgroundColor: "#fff", border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #ffd400" }}
          >
            {/* Icône + titre */}
            <div className="flex items-center gap-3">
              <span
                className="shrink-0 w-10 h-10 flex items-center justify-center border-[3px] border-[#1a1a1a] rounded-[10px]"
                style={{ backgroundColor: "#ffd400", boxShadow: "3px 3px 0 #1a1a1a" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <h3 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "24px" }}>
                AVANT DE CONTINUER
              </h3>
            </div>

            {/* Message */}
            <p className="font-archivo text-[#1a1a1a] text-sm leading-relaxed" style={{ fontWeight: 700 }}>
              Le mode Animation nécessite un PC suffisamment puissant pour créer et rendre votre animation dans les temps impartis.
              Assurez-vous que votre machine est à la hauteur avant de lancer une partie !
            </p>

            {/* Case "ne plus afficher" */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setDontRemind((v) => !v)}
                className="shrink-0 w-5 h-5 border-[3px] border-[#1a1a1a] flex items-center justify-center transition-colors duration-100"
                style={{ borderRadius: "5px", backgroundColor: dontRemind ? "#1a1a1a" : "#fff", boxShadow: "2px 2px 0 #1a1a1a" }}
              >
                {dontRemind && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              <span className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/70">
                Ne plus me rappeler
              </span>
            </label>

            {/* Bouton OK */}
            <button
              type="button"
              onClick={confirmAnimWarning}
              className="w-full font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
              style={{ borderRadius: "12px", boxShadow: "0 6px 0 #1a1a1a", fontSize: "22px" }}
            >
              OK, COMPRIS !
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Selectable card ──────────────────────────────────────────────────────────

function SelectableCard({
  children,
  selected,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative text-left w-full bg-white border-[5px] rounded-[16px] p-6 transition-all duration-100 focus-visible:outline-none"
      style={{
        borderColor: disabled ? "#ccc" : selected ? "#ff2e2e" : "#1a1a1a",
        boxShadow: disabled ? "6px 6px 0 #ccc" : selected ? "6px 6px 0 #ff2e2e" : "6px 6px 0 #1a1a1a",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: disabled ? "none" : undefined,
      }}
    >
      {selected && !disabled && (
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

function IconDiscord() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.006.043.017.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
