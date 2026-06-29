import Link from "next/link";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import OnlineCounter from "@/components/OnlineCounter";
import FloatingOnomatopoeia from "@/components/FloatingOnomatopoeia";
import ShareButton from "@/components/ShareButton";

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "REJOINS",
    description:
      "Choisis ton mode et ta durée, trouve jusqu'à 10 brawlers dans le lobby.",
  },
  {
    number: "02",
    title: "MODELISE",
    description:
      "Le brief tombe, le chrono démarre. Sors ton meilleur mesh et soumets ton .glb avant la fin.",
  },
  {
    number: "03",
    title: "VOTE",
    description:
      "La commu juge chaque rendu. BIEN, MAL ou étoile dorée. Les votes décident, l'ELO bouge.",
  },
];

const SOCIALS: { name: string; href: string; icon: React.ReactNode }[] = [
  { name: "Discord",    href: "#",    icon: <IconDiscord /> },
  { name: "TikTok",    href: "#",    icon: <IconTikTok /> },
  { name: "Instagram", href: "#",    icon: <IconInstagram /> },
  { name: "YouTube",   href: "#",    icon: <IconYouTube /> },
  {
    name: "Email",
    href: "mailto:glbaugustin@gmail.com?subject=Contribution%20MeshBrawl%20%E2%80%94%20Mod%C3%A8le%203D%20%2F%20Blueprint&body=Bonjour%2C%0A%0AJe%20souhaite%20contribuer%20au%20projet%20MeshBrawl%20avec%20le%20fichier%20suivant%20%3A%0A%0A-%20Type%20%3A%20(mod%C3%A8le%203D%20%2F%20blueprint)%0A-%20Logiciel%20utilis%C3%A9%20%3A%0A-%20Description%20%3A%0A%0AMerci%20!",
    icon: <IconMail />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  let initialCount = 0;
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", since);
    initialCount = count ?? 0;
  } catch (e) {
    console.error("Online count error:", e);
  }

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative overflow-x-hidden min-h-[calc(100vh-64px)] flex flex-col justify-center py-12 px-4" style={{ paddingTop: "clamp(24px, 8vh, 80px)", paddingBottom: "clamp(24px, 8vh, 80px)" }}>
        {/* Onomatopées aléatoires qui pop et disparaissent */}
        <FloatingOnomatopoeia />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center" style={{ gap: "clamp(12px, 3vh, 40px)" }}>
          {/* Decorative arena badge */}
          <span
            className="font-archivo-black text-xs sm:text-sm uppercase tracking-widest bg-white border-[3px] border-[#1a1a1a] px-4 sm:px-6 py-2 inline-block"
            style={{
              boxShadow: "3px 3px 0 #1a1a1a",
              transform: "rotate(-2deg)",
              borderRadius: "8px",
            }}
          >
            ARENE DE MODELISATION 3D
          </span>

          {/* Slogan */}
          <h1 className="font-bangers leading-none tracking-widest w-full">
            <span
              className="block"
              style={{
                fontSize: "clamp(40px, min(14vw, 16vh), 130px)",
                color: "#ff2e2e",
                WebkitTextStroke: "clamp(2px, 0.3vw, 4px) #1a1a1a",
                textShadow: "clamp(3px, 0.5vw, 6px) clamp(3px, 0.5vw, 6px) 0 #1a1a1a",
              }}
            >
              MODELISE.
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(40px, min(14vw, 16vh), 130px)",
                color: "#1a1a1a",
                WebkitTextStroke: "clamp(2px, 0.3vw, 4px) #ffd400",
                textShadow: "clamp(3px, 0.5vw, 6px) clamp(3px, 0.5vw, 6px) 0 #ff2e2e",
              }}
            >
              BRAWL.
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(40px, min(14vw, 16vh), 130px)",
                color: "#2e6bff",
                WebkitTextStroke: "clamp(2px, 0.3vw, 4px) #1a1a1a",
                textShadow: "clamp(3px, 0.5vw, 6px) clamp(3px, 0.5vw, 6px) 0 #1a1a1a",
              }}
            >
              VOTE.
            </span>
          </h1>

          {/* CTA */}
          <div className="flex items-stretch gap-3 sm:gap-4">
            {/* Tribunal des bannis */}
            <Link
              href="/tribunal"
              aria-label="Tribunal des bannis"
              title="Tribunal des bannis"
              className="flex items-center justify-center bg-white text-[#1a1a1a] border-[4px] border-[#1a1a1a] rounded-[16px] sm:rounded-[20px] shadow-[0_8px_0_#1a1a1a] sm:shadow-[0_12px_0_#1a1a1a] hover:-translate-y-[4px] hover:shadow-[0_12px_0_#1a1a1a] sm:hover:shadow-[0_16px_0_#1a1a1a] active:shadow-[0_2px_0_#1a1a1a] transition-all duration-100 hover:bg-[#ffd400]"
              style={{ width: "clamp(58px, 9vw, 90px)", aspectRatio: "1 / 1" }}
            >
              <IconGavel />
            </Link>

            <Link href="/match">
              <Button
                variant="primary"
                className="!inline-flex items-center gap-3 sm:gap-4 !rounded-[16px] sm:!rounded-[20px] !shadow-[0_8px_0_#1a1a1a] sm:!shadow-[0_12px_0_#1a1a1a] hover:!-translate-y-[4px] hover:!shadow-[0_12px_0_#1a1a1a] sm:hover:!shadow-[0_16px_0_#1a1a1a] active:!shadow-[0_2px_0_#1a1a1a]"
                style={{ fontSize: "clamp(28px, 5vw, 52px)", padding: "clamp(10px, 1.5vw, 18px) clamp(28px, 5vw, 56px)" }}
              >
                JOUER
                <IconArrowRight />
              </Button>
            </Link>
          </div>

          {/* Online counter */}
          <OnlineCounter initial={initialCount} />
        </div>
      </section>

      {/* ── RESEAUX ── */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-8">
          <h2 className="font-archivo-black text-xl sm:text-2xl uppercase text-[#1a1a1a] tracking-widest">
            REJOINS LA BAGARRE :
          </h2>
          <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/50 text-center" style={{ fontWeight: 700, paddingTop: "10px" }}>
            Tu as un modèle 3D ou un blueprint à partager ? Envoie-le nous !
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            {SOCIALS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                target={social.href.startsWith("mailto") ? undefined : "_blank"}
                rel={social.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="w-14 h-14 flex items-center justify-center bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#ffd400] hover:-translate-y-2 transition-[colors,transform] duration-150"
                style={{ boxShadow: "3px 3px 0 #1a1a1a", borderRadius: "10px" }}
              >
                {social.icon}
              </a>
            ))}
            <ShareButton />
          </div>
        </div>
      </section>

      {/* ── 3 ETAPES ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <Card key={step.number} className="flex flex-col gap-2">
              <span
                className="font-bangers leading-none text-[#ff2e2e]"
                style={{ fontSize: "96px", lineHeight: 1 }}
              >
                {step.number}
              </span>
              <h3 className="font-archivo-black text-2xl uppercase text-[#1a1a1a] tracking-wide">
                {step.title}
              </h3>
              <p className="font-archivo font-semibold text-[#1a1a1a]/75 text-base leading-relaxed">
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: "#1a1a1a" }} className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center flex flex-col gap-5">
          <p className="font-bangers text-[#ffd400] tracking-widest text-3xl">
            MESHBRAWL
          </p>
          <p className="font-archivo text-[#ffd400]/70 text-sm leading-relaxed max-w-3xl mx-auto">
            MeshBrawl est la plateforme de battle de modélisation 3D
            compétitive. Rejoins des lobbies de 10 joueurs, reçois un brief
            aléatoire, crée ton mesh en temps limité et laisse la communauté
            voter. Compatible Blender, Cinema 4D, Maya, ZBrush et tous les
            logiciels 3D.
          </p>
          <p className="font-archivo-black text-[#ffd400]/50 text-xs uppercase tracking-widest">
            2025 MeshBrawl
          </p>
        </div>
      </footer>
    </main>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconArrowRight() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconGavel() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: "clamp(28px, 4.5vw, 44px)", height: "clamp(28px, 4.5vw, 44px)" }}
    >
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.006.043.017.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}
