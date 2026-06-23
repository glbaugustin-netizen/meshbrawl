"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id:           string;
  pseudo:       string;
  avatar_color: string | null;
  elo:          number;
  country:      string | null;
  rang:         number;
  isCurrentUser?: boolean;
}

type TabId = "mondial" | "pays";

const TABS: { id: TabId; label: string }[] = [
  { id: "mondial", label: "MONDIAL"  },
  { id: "pays",    label: "MON PAYS" },
];

// ─── Avatar fallback colours ──────────────────────────────────────────────────

const AVATAR_COLORS = ["#ff2e2e", "#2e6bff", "#0aa36b", "#c026d3", "#ff9500", "#0891b2", "#65a30d", "#ea580c"];
const fallbackColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ─── Podium config ────────────────────────────────────────────────────────────

const PODIUM = {
  1: { h: 140, px: 80,  fontSize: "22px", borderColor: "#ffd400", stepBg: "#ffd400" },
  2: { h: 96,  px: 64,  fontSize: "17px", borderColor: "#aaaaaa", stepBg: "#ffffff" },
  3: { h: 64,  px: 56,  fontSize: "15px", borderColor: "#cd7f32", stepBg: "#ffffff" },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassementPage() {
  const supabase = createClient();

  const [activeTab,    setActiveTab]    = useState<TabId>("mondial");
  const [mondial,      setMondial]      = useState<Player[]>([]);
  const [pays,         setPays]         = useState<Player[]>([]);
  const [currentUser,  setCurrentUser]  = useState<Player | null>(null);
  const [userRang,     setUserRang]     = useState<number | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isConnected,  setIsConnected]  = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Top 500 mondial
      const { data: mondialRaw } = await supabase
        .from('users')
        .select('id, pseudo, avatar_color, elo, country')
        .order('elo', { ascending: false })
        .limit(500);

      const mondialPlayers: Player[] = (mondialRaw || []).map((p, idx) => ({
        ...p,
        rang: idx + 1,
        elo:  p.elo  ?? 0,
      }));

      // Session utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      let mePlayer: Player | null = null;
      let meRang: number | null   = null;
      let userCountry: string | null = null;

      if (session?.user) {
        setIsConnected(true);

        const { data: meRaw } = await supabase
          .from('users')
          .select('id, pseudo, avatar_color, elo, country')
          .eq('id', session.user.id)
          .single();

        if (meRaw) {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gt('elo', meRaw.elo ?? 0);

          meRang    = (count ?? 0) + 1;
          userCountry = meRaw.country;

          mePlayer = {
            ...meRaw,
            rang:          meRang,
            elo:           meRaw.elo ?? 0,
            isCurrentUser: true,
          };
        }
      }

      // Marque l'utilisateur dans la liste mondiale
      const mondialFinal = mondialPlayers.map((p) =>
        mePlayer && p.id === mePlayer.id ? { ...p, isCurrentUser: true } : p
      );

      // Top 100 pays
      let paysPlayers: Player[] = [];
      if (userCountry) {
        const { data: paysRaw } = await supabase
          .from('users')
          .select('id, pseudo, avatar_color, elo, country')
          .eq('country', userCountry)
          .order('elo', { ascending: false })
          .limit(100);

        paysPlayers = (paysRaw || []).map((p, idx) => ({
          ...p,
          rang:          idx + 1,
          elo:           p.elo ?? 0,
          isCurrentUser: mePlayer ? p.id === mePlayer.id : false,
        }));
      }

      setMondial(mondialFinal);
      setPays(paysPlayers);
      setCurrentUser(mePlayer);
      setUserRang(meRang);
      setLoading(false);
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data    = activeTab === "mondial" ? mondial : pays;
  const podium  = data.slice(0, 3);
  const tableRows = data.slice(3);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="font-bangers text-[#1a1a1a] tracking-widest" style={{ fontSize: "32px" }}>
          CHARGEMENT...
        </p>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-64px)] px-4 py-12 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">

          {/* ── Title ── */}
          <h1
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center leading-none"
            style={{ fontSize: "52px", textShadow: "4px 4px 0 #ff2e2e" }}
          >
            CLASSEMENT
          </h1>

          {/* ── Tabs ── */}
          <div
            className="flex overflow-hidden border-[4px] border-[#1a1a1a]"
            style={{ borderRadius: "14px", boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-3 font-archivo-black text-sm uppercase tracking-widest transition-colors duration-100"
                style={{
                  backgroundColor: activeTab === tab.id ? "#ff2e2e" : "#ffffff",
                  color:           activeTab === tab.id ? "#ffffff" : "#1a1a1a",
                  borderRight:     i < TABS.length - 1 ? "3px solid #1a1a1a" : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── MON PAYS — non connecté ── */}
          {activeTab === "pays" && !isConnected && (
            <div className="flex flex-col items-center gap-4 py-16">
              <span
                className="font-bangers text-white bg-[#ff2e2e] border-[4px] border-[#1a1a1a] px-6 py-3 uppercase tracking-widest"
                style={{ borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a", fontSize: "20px", transform: "rotate(-1deg)" }}
              >
                ACCES RESTREINT
              </span>
              <p className="font-archivo-black text-[#1a1a1a] text-center uppercase tracking-widest text-sm">
                Connecte-toi pour voir ton classement pays.
              </p>
            </div>
          )}

          {/* ── Liste vide ── */}
          {(activeTab === "mondial" || isConnected) && data.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <span
                className="font-bangers text-white bg-[#ff2e2e] border-[4px] border-[#1a1a1a] px-6 py-3 uppercase tracking-widest"
                style={{ borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a", fontSize: "24px", transform: "rotate(-2deg)" }}
              >
                POW !
              </span>
              <p className="font-bangers text-[#1a1a1a] text-center tracking-widest" style={{ fontSize: "26px" }}>
                Aucun brawler classé pour l&apos;instant.
              </p>
              <p className="font-archivo-black text-[#ff2e2e] text-center uppercase tracking-widest text-sm">
                Sois le premier !
              </p>
            </div>
          )}

          {/* ── Podium ── */}
          {data.length >= 1 && (
            <section className="relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span
                  className="font-bangers select-none"
                  style={{ fontSize: "clamp(100px, 22vw, 180px)", color: "#ff2e2e", opacity: 0.04, transform: "rotate(-6deg)", lineHeight: 1 }}
                >
                  TOP 3
                </span>
              </div>

              <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-4">
                {[podium[1], podium[0], podium[2]].map((player) => {
                  if (!player) return null;
                  const cfg = PODIUM[player.rang as 1 | 2 | 3];
                  const colorIdx = data.indexOf(player);
                  return (
                    <PodiumCol
                      key={player.id}
                      player={player}
                      cfg={cfg}
                      colorIdx={colorIdx}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Table ── */}
          {tableRows.length > 0 && (
            <section>
              <div
                className="border-[5px] border-[#1a1a1a] rounded-[16px] overflow-hidden"
                style={{ boxShadow: "6px 6px 0 #1a1a1a" }}
              >
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr style={{ backgroundColor: "#1a1a1a" }}>
                      {["RANG", "JOUEUR", "ELO", "PAYS"].map((col) => (
                        <th
                          key={col}
                          className="font-archivo-black text-[#ffd400] text-xs uppercase tracking-widest text-left px-4 py-3"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => (
                      <TableRow
                        key={row.id}
                        row={row}
                        colorIdx={data.indexOf(row)}
                        isEven={idx % 2 === 0}
                        isLast={idx === tableRows.length - 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* ── Sticky personal rank bar ── */}
      {currentUser && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t-[4px] border-[#ffd400] px-4 py-3"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-[2px] border-[#ffd400] flex items-center justify-center font-archivo-black text-white shrink-0"
                style={{ backgroundColor: currentUser.avatar_color || '#8a3ffc', fontSize: "11px" }}
              >
                {(currentUser.pseudo || '').slice(0, 2).toUpperCase() || '??'}
              </div>
              <span className="font-bangers text-[#ffd400] tracking-widest leading-none" style={{ fontSize: "22px" }}>
                TON RANG : #{userRang ?? '?'}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-archivo-black text-sm" style={{ color: "#0aa36b" }}>
                {currentUser.elo} ELO
              </span>
              {currentUser.country && (
                <span
                  className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#ffd400] px-2 py-0.5"
                  style={{ borderRadius: "5px" }}
                >
                  {currentUser.country}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Podium column ────────────────────────────────────────────────────────────

function PodiumCol({
  player, cfg, colorIdx,
}: {
  player:   Player;
  cfg:      (typeof PODIUM)[1 | 2 | 3];
  colorIdx: number;
}) {
  const isFirst  = player.rang === 1;
  const initials = (player.pseudo || '').slice(0, 2).toUpperCase() || '??';
  const color    = player.avatar_color || fallbackColor(colorIdx);

  return (
    <div
      className="flex flex-col items-center flex-1 max-w-[190px] cursor-pointer hover:-translate-y-1 transition-transform duration-100"
      onClick={() => window.location.href = `/joueur/${player.id}`}
    >
      {player.isCurrentUser && (
        <span
          className="font-archivo-black text-xs text-white bg-[#ff2e2e] border-[2px] border-[#1a1a1a] px-2 py-0.5 mb-1 uppercase tracking-wide"
          style={{ borderRadius: "6px", boxShadow: "2px 2px 0 #1a1a1a" }}
        >
          VOUS
        </span>
      )}
      {isFirst && !player.isCurrentUser && (
        <span
          className="font-bangers text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-3 py-1 mb-2 uppercase tracking-widest"
          style={{ borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a", transform: "rotate(-2deg)", fontSize: "16px" }}
        >
          N° 1
        </span>
      )}

      <div
        className="rounded-full flex items-center justify-center font-archivo-black text-white shrink-0"
        style={{
          width:           cfg.px,
          height:          cfg.px,
          fontSize:        cfg.fontSize,
          backgroundColor: color,
          border:          `5px solid ${cfg.borderColor}`,
          boxShadow:       "0 0 0 3px #1a1a1a, 3px 3px 0 #1a1a1a",
        }}
      >
        {initials}
      </div>

      <p className="font-archivo-black text-[#1a1a1a] text-center mt-2 truncate w-full px-1 leading-tight" style={{ fontSize: isFirst ? "14px" : "12px" }}>
        {player.pseudo || "???"}
      </p>
      <p className="font-archivo-black text-sm mt-0.5" style={{ color: "#0aa36b" }}>
        {player.elo}
      </p>
      {player.country && (
        <span
          className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-1.5 py-0.5 mt-1 uppercase"
          style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
        >
          {player.country}
        </span>
      )}

      <div
        className="w-full mt-3 border-[4px] border-[#1a1a1a] flex items-center justify-center"
        style={{ height: cfg.h, backgroundColor: cfg.stepBg, borderRadius: "10px 10px 0 0", boxShadow: "4px 0 0 #1a1a1a" }}
      >
        <span className="font-bangers text-[#1a1a1a] leading-none" style={{ fontSize: "56px", opacity: isFirst ? 1 : 0.15 }}>
          {player.rang}
        </span>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({
  row, colorIdx, isEven, isLast,
}: {
  row:      Player;
  colorIdx: number;
  isEven:   boolean;
  isLast:   boolean;
}) {
  const highlight = row.isCurrentUser;
  const rowBg     = highlight ? "#fff7cc" : isEven ? "#ffffff" : "#fafafa";
  const initials  = (row.pseudo || '').slice(0, 2).toUpperCase() || '??';
  const color     = row.avatar_color || fallbackColor(colorIdx);

  return (
    <tr
      style={{ backgroundColor: rowBg, cursor: "pointer" }}
      onClick={() => window.location.href = `/joueur/${row.id}`}
      className="hover:brightness-95 transition-all duration-75"
    >
      <td
        className={`px-4 py-3 ${isLast ? "" : "border-b-[2px] border-b-[#efefef]"}`}
        style={{ borderLeft: highlight ? "5px solid #ff2e2e" : "5px solid transparent" }}
      >
        <span className="font-bangers text-xl text-[#1a1a1a]">{row.rang}</span>
      </td>

      <td className={`px-4 py-3 ${isLast ? "" : "border-b-[2px] border-b-[#efefef]"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full border-[3px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white text-xs shrink-0"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-archivo-black text-sm text-[#1a1a1a] truncate">{row.pseudo || "???"}</span>
            {highlight && (
              <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]">VOUS</span>
            )}
          </div>
        </div>
      </td>

      <td className={`px-4 py-3 ${isLast ? "" : "border-b-[2px] border-b-[#efefef]"}`}>
        <span className="font-archivo-black text-sm" style={{ color: "#0aa36b" }}>{row.elo}</span>
      </td>

      <td className={`px-4 py-3 ${isLast ? "" : "border-b-[2px] border-b-[#efefef]"}`}>
        {row.country ? (
          <span
            className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-2 py-0.5 uppercase"
            style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
          >
            {row.country}
          </span>
        ) : (
          <span className="font-archivo-black text-[10px] text-[#1a1a1a]/30 uppercase">—</span>
        )}
      </td>
    </tr>
  );
}
