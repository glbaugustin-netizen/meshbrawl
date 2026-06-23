import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Card from "@/components/Card";
import Link from "next/link";

export default async function JoueurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("users")
    .select("id, pseudo, avatar_color, description, country, elo, parties_jouees, meilleur_classement, instagram, tiktok, youtube")
    .eq("id", id)
    .single();

  if (!player) notFound();

  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gt("elo", player.elo ?? 0);
  const rang = (count ?? 0) + 1;

  const initials   = (player.pseudo || "").slice(0, 2).toUpperCase() || "??";
  const avatarColor = player.avatar_color || "#8a3ffc";
  const hasSocials  = player.instagram || player.tiktok || player.youtube;

  const STATS = [
    { label: "PARTIES JOUEES",      value: String(player.parties_jouees ?? 0) },
    { label: "MEILLEUR CLASSEMENT", value: player.meilleur_classement ? `#${player.meilleur_classement}` : "-" },
    { label: "ELO ACTUEL",          value: String(player.elo ?? 1000) },
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Retour classement */}
        <Link
          href="/classement"
          className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2 w-fit hover:-translate-x-1 transition-transform duration-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          CLASSEMENT
        </Link>

        {/* Header */}
        <Card className="!p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="rounded-full border-[6px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white shrink-0"
              style={{ width: 120, height: 120, fontSize: "28px", backgroundColor: avatarColor, boxShadow: "4px 4px 0 #1a1a1a" }}
            >
              {initials}
            </div>
            <div className="flex flex-col gap-2 items-center sm:items-start text-center sm:text-left">
              <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "40px" }}>
                {player.pseudo || "BRAWLER"}
              </h1>
              {player.country && (
                <span className="font-archivo-black text-xs text-[#1a1a1a] bg-[#ffd400] border-[3px] border-[#1a1a1a] px-3 py-1 uppercase tracking-widest" style={{ borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a" }}>
                  {player.country}
                </span>
              )}
              {player.description ? (
                <p className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed" style={{ fontWeight: 700 }}>{player.description}</p>
              ) : (
                <p className="font-archivo text-[#1a1a1a]/40 text-sm italic" style={{ fontWeight: 600 }}>Aucune description.</p>
              )}
            </div>
          </div>
        </Card>

        {/* ELO badge */}
        <div className="flex flex-col items-center py-8 px-6 rounded-[16px] border-[5px] border-[#1a1a1a]" style={{ backgroundColor: "#1a1a1a", boxShadow: "6px 6px 0 #ffd400" }}>
          <span className="font-bangers tracking-widest text-[#ffd400] leading-none tabular-nums" style={{ fontSize: "52px" }}>{player.elo ?? 1000}</span>
          <span className="font-archivo-black text-xs uppercase tracking-widest mt-1" style={{ color: "#ffd400", opacity: 0.6 }}>ELO</span>
          <span className="font-archivo-black text-sm uppercase tracking-widest mt-2" style={{ color: "#ffd400" }}>#{rang} MONDIAL</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <Card key={s.label} className="!p-4 flex flex-col items-center text-center gap-1">
              <span className="font-bangers text-[#ff2e2e] leading-none tabular-nums" style={{ fontSize: "32px" }}>{s.value}</span>
              <span className="font-archivo-black text-[#1a1a1a]/55 uppercase leading-tight text-center" style={{ fontSize: "10px", letterSpacing: "0.08em" }}>{s.label}</span>
            </Card>
          ))}
        </div>

        {/* Réseaux */}
        {hasSocials && (
          <div className="flex flex-col gap-4">
            <h2 className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]" style={{ borderLeft: "5px solid #ff2e2e", paddingLeft: "14px" }}>
              RESEAUX
            </h2>
            <div className="flex flex-wrap gap-3">
              {player.instagram && (
                <a href={`https://instagram.com/${player.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-archivo-black text-white text-sm uppercase tracking-wide px-5 py-2.5 border-[4px] border-[#1a1a1a] hover:-translate-y-[2px] transition-transform duration-100"
                  style={{ backgroundColor: "#2e6bff", borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a" }}>
                  @{player.instagram}
                </a>
              )}
              {player.tiktok && (
                <a href={`https://tiktok.com/@${player.tiktok}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-archivo-black text-white text-sm uppercase tracking-wide px-5 py-2.5 border-[4px] border-[#1a1a1a] hover:-translate-y-[2px] transition-transform duration-100"
                  style={{ backgroundColor: "#2e6bff", borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a" }}>
                  @{player.tiktok}
                </a>
              )}
              {player.youtube && (
                <a href={`https://youtube.com/${player.youtube}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-archivo-black text-white text-sm uppercase tracking-wide px-5 py-2.5 border-[4px] border-[#1a1a1a] hover:-translate-y-[2px] transition-transform duration-100"
                  style={{ backgroundColor: "#2e6bff", borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a" }}>
                  {player.youtube}
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
