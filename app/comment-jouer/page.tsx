import Card from "@/components/Card";
import Badge from "@/components/Badge";

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODES = [
  {
    label: "MODELISATION",
    accent: "#2e6bff",
    icon: <IconBlueprint />,
    description:
      "Reçois un blueprint. Reproduis l'objet aussi fidèlement que possible dans ton logiciel 3D. Soumets un fichier .glb.",
  },
  {
    label: "TEXTURING",
    accent: "#0aa36b",
    icon: <IconBrush />,
    description:
      "Reçois un mesh 3D non texturé. Applique des textures dans le style imposé. Soumets un fichier .glb.",
  },
  {
    label: "ANIMATION",
    accent: "#ff2e2e",
    icon: <IconPlay />,
    description:
      "Reçois un personnage rigué. Anime-le, rends une vidéo de quelques secondes. Soumets une vidéo.",
  },
  {
    label: "IMAGINAIRE",
    accent: "#c026d3",
    icon: <IconBulb />,
    description:
      "Reçois un prompt texte et une image de référence. Crée librement l'objet demandé. Soumets un fichier .glb.",
  },
];

const DUREES = [
  { duree: "30 MIN",    diff: "Contraintes extrêmes, speed run" },
  { duree: "1 HEURE",  diff: "Objet simple" },
  { duree: "5 HEURES", diff: "Objet détaillé" },
  { duree: "1 JOUR",   diff: "Scène complexe" },
  { duree: "1 SEMAINE",diff: "Chef d'oeuvre" },
];

const VOTES = [
  {
    label: "BIEN",
    bg: "#0aa36b",
    color: "#fff",
    shadow: "#065c3d",
    icon: <IconThumbUp />,
    description: "Tu aimes le modèle. Le joueur gagne des points.",
  },
  {
    label: "MAL",
    bg: "#ff2e2e",
    color: "#fff",
    shadow: "#8b0000",
    icon: <IconThumbDown />,
    description: "Tu n'aimes pas. Le joueur perd des points.",
  },
  {
    label: "MON PREFERE",
    bg: "#ffd400",
    color: "#1a1a1a",
    shadow: "#7a6300",
    icon: <IconStar />,
    description: "Ton vote ultime. Une seule fois par partie. Bonus points maximum.",
  },
];

const REGLES = [
  {
    icon: <IconBan />,
    accent: "#ff2e2e",
    title: "IA INTERDITE",
    description: "L'utilisation de modèles générés par IA est strictement interdite. Si détectée : ban permanent avec possibilité de demande de déban.",
  },
  {
    icon: <IconDownload />,
    accent: "#ff2e2e",
    title: "PAS DE MODELES TELECHARGES",
    description: "Utiliser un modèle 3D téléchargé sur une plateforme tierce est interdit. Exception : arrière-plan ou figuration uniquement, et seulement en mode Animation. Interdit en Modélisation, Texturing et Imaginaire. Ban permanent si détecté.",
  },
  {
    icon: <IconClock />,
    accent: "#ff8a00",
    title: "CREE PENDANT LA PARTIE",
    description: "Ton modèle doit être entièrement créé pendant le temps imparti. Aucun fichier préparé à l'avance n'est autorisé.",
  },
  {
    icon: <IconUsers />,
    accent: "#ff8a00",
    title: "PAS DE MULTI-COMPTES",
    description: "Créer plusieurs comptes pour manipuler l'ELO est interdit. Ban permanent si détecté.",
  },
  {
    icon: <IconVote />,
    accent: "#ff8a00",
    title: "VOTES EQUITABLES",
    description: "S'organiser avec d'autres joueurs pour voter de manière coordonnée est interdit. Vote uniquement sur la qualité du modèle.",
  },
  {
    icon: <IconHeart />,
    accent: "#0aa36b",
    title: "FAIRPLAY ET RESPECT",
    description: "Reste fairplay et garantis une bonne ambiance. Aucun contenu dégradant, violent, sexuel ou ciblant des personnes ou minorités de manière virulente.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommentJouerPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-12">
      <div className="max-w-4xl mx-auto flex flex-col gap-16">

        {/* ── Title ── */}
        <div className="flex flex-col items-center gap-5 relative">
          {/* Decorative POW! badge */}
          <div
            className="hidden sm:block absolute right-0 top-0"
            style={{ transform: "rotate(14deg)" }}
          >
            <Badge label="POW!" rotate={0} />
          </div>

          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center leading-none"
            style={{ fontSize: "clamp(44px, 8vw, 64px)", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            COMMENT JOUER
          </h1>
          <p
            className="font-archivo text-[#1a1a1a]/70 text-center max-w-xl"
            style={{ fontWeight: 700, fontSize: "16px" }}
          >
            Choisis un mode, modélise dans ton logiciel, soumets ton fichier. La commu vote. L&apos;ELO bouge.
          </p>
        </div>

        {/* ── Section 1 — Modes ── */}
        <section className="flex flex-col gap-6">
          <SectionTitle>LES MODES DE JEU</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {MODES.map((mode) => (
              <Card key={mode.label} className="flex flex-col gap-4">
                {/* Icon + label */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 flex items-center justify-center border-[3px] border-[#1a1a1a] shrink-0"
                    style={{
                      backgroundColor: mode.accent,
                      borderRadius: "12px",
                      boxShadow: "3px 3px 0 #1a1a1a",
                    }}
                  >
                    {mode.icon}
                  </div>
                  <h3
                    className="font-archivo-black uppercase text-[#1a1a1a] tracking-wide leading-tight"
                    style={{ fontSize: "18px" }}
                  >
                    {mode.label}
                  </h3>
                </div>

                {/* Description */}
                <p
                  className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed"
                  style={{ fontWeight: 600 }}
                >
                  {mode.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Section 2 — Durées ── */}
        <section className="flex flex-col gap-6">
          <SectionTitle>LES DUREES</SectionTitle>

          <div
            className="border-[5px] border-[#1a1a1a] rounded-[16px] overflow-hidden"
            style={{ boxShadow: "6px 6px 0 #1a1a1a" }}
          >
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ backgroundColor: "#1a1a1a" }}>
                  <th className="font-archivo-black text-[#ffd400] text-xs uppercase tracking-widest text-left px-5 py-3">
                    DUREE
                  </th>
                  <th className="font-archivo-black text-[#ffd400] text-xs uppercase tracking-widest text-left px-5 py-3">
                    RECOMMANDE POUR
                  </th>
                </tr>
              </thead>
              <tbody>
                {DUREES.map((row, i) => (
                  <tr
                    key={row.duree}
                    style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff7cc" }}
                  >
                    <td
                      className={`px-5 py-3 ${i < DUREES.length - 1 ? "border-b-[2px] border-b-[#efefef]" : ""}`}
                    >
                      <span className="font-bangers text-[#ff2e2e] tracking-widest" style={{ fontSize: "22px" }}>
                        {row.duree}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-3 ${i < DUREES.length - 1 ? "border-b-[2px] border-b-[#efefef]" : ""}`}
                    >
                      <span className="font-archivo text-[#1a1a1a] text-sm" style={{ fontWeight: 600 }}>
                        {row.diff}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 3 — Vote ── */}
        <section className="flex flex-col gap-6">
          <SectionTitle>LE SYSTEME DE VOTE</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VOTES.map((vote) => (
              <div
                key={vote.label}
                className="flex flex-col items-center text-center gap-3 p-6 border-[5px] border-[#1a1a1a] rounded-[16px]"
                style={{
                  backgroundColor: vote.bg,
                  color: vote.color,
                  boxShadow: `6px 6px 0 ${vote.shadow}`,
                }}
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 bg-white/20 border-[3px] border-[#1a1a1a] rounded-full">
                  {vote.icon}
                </div>

                {/* Label */}
                <span
                  className="font-bangers uppercase tracking-widest leading-none"
                  style={{ fontSize: "28px" }}
                >
                  {vote.label}
                </span>

                {/* Description */}
                <p className="font-archivo text-sm leading-snug" style={{ fontWeight: 600, opacity: 0.9 }}>
                  {vote.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4 — ELO ── */}
        <section className="flex flex-col gap-6">
          <SectionTitle>LE SYSTEME ELO</SectionTitle>

          <Card className="flex flex-col gap-5">
            {/* Explanation */}
            <p
              className="font-archivo text-[#1a1a1a] text-base leading-relaxed"
              style={{ fontWeight: 600 }}
            >
              Ton ELO monte quand la commu aime ton travail, et baisse quand elle ne l&apos;aime pas.
              Le gain est calculé proportionnellement au nombre de votes positifs que tu reçois
              par rapport au maximum possible. Equitable à 3 ou 10 joueurs.
            </p>

            {/* Formula block */}
            <div
              className="flex flex-col items-center gap-2 border-[4px] border-[#1a1a1a] rounded-[12px] px-6 py-4"
              style={{ backgroundColor: "#ffd400", boxShadow: "4px 4px 0 #1a1a1a" }}
            >
              <span className="font-archivo-black text-[#1a1a1a] text-xs uppercase tracking-widest opacity-60">
                FORMULE
              </span>
              <span
                className="font-bangers text-[#1a1a1a] tracking-widest text-center leading-tight"
                style={{ fontSize: "clamp(16px, 4vw, 22px)" }}
              >
                ELO GAGNE = (POINTS RECUS / POINTS MAX) × 100
              </span>
            </div>

            {/* Example */}
            <div className="flex flex-col gap-2">
              <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/50">
                EXEMPLE
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { label: "Recu",    value: "71 pts" },
                  { label: "Max",     value: "100 pts" },
                  { label: "ELO",     value: "+71 ELO" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center gap-1 border-[3px] border-[#1a1a1a] rounded-[10px] py-3"
                    style={{ backgroundColor: "#fafafa", boxShadow: "2px 2px 0 #1a1a1a" }}
                  >
                    <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/50">
                      {item.label}
                    </span>
                    <span
                      className="font-bangers text-[#1a1a1a] leading-none"
                      style={{ fontSize: "24px", color: item.label === "ELO" ? "#0aa36b" : "#1a1a1a" }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* ── Section 5 — Règles ── */}
        <section className="flex flex-col gap-6">
          <SectionTitle>REGLES DU JEU</SectionTitle>

          <div className="flex flex-col gap-3">
            {REGLES.map((regle) => (
              <div
                key={regle.title}
                className="flex items-start gap-4 p-5 border-[4px] border-[#1a1a1a] rounded-[14px] bg-white"
                style={{ boxShadow: "5px 5px 0 #1a1a1a" }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center shrink-0 border-[3px] border-[#1a1a1a]"
                  style={{
                    backgroundColor: regle.accent,
                    borderRadius: "10px",
                    boxShadow: "3px 3px 0 #1a1a1a",
                  }}
                >
                  {regle.icon}
                </div>

                <div className="flex flex-col gap-1">
                  <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-wide" style={{ fontSize: "14px" }}>
                    {regle.title}
                  </p>
                  <p className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed" style={{ fontWeight: 600 }}>
                    {regle.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none"
      style={{ fontSize: "36px", borderLeft: "6px solid #ff2e2e", paddingLeft: "16px" }}
    >
      {children}
    </h2>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBlueprint() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 15.8 4 19 7.2 20.7C7.6 20.9 8 21.4 8 22C8 22.6 8.4 23 9 23C9.5 23 10.3 22.8 10.8 22C11.3 21.2 12.2 20.8 13.2 20.8C17.9 20.5 22 16.7 22 12C22 6.48 17.52 2 12 2Z" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="9"  cy="7.5" r="1.5" fill="#fff" stroke="none" />
      <circle cx="13" cy="5.5" r="1.5" fill="#fff" stroke="none" />
      <circle cx="17" cy="8"   r="1.5" fill="#fff" stroke="none" />
      <circle cx="19" cy="13"  r="1.5" fill="#fff" stroke="none" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" fill="#fff" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21h6" />
      <path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.15-3 5.19V17H9v-2.81C7.2 13.15 6 11.22 6 9a6 6 0 0 1 6-6z" />
    </svg>
  );
}

function IconThumbUp() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconThumbDown() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

function IconBan() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
      <line x1="4" y1="15" x2="20" y2="15" strokeDasharray="2 2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconVote() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24"
      fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
