"use client";

export const dynamic = 'force-dynamic';

import { useRouter } from "next/navigation";
import Button from "@/components/Button";

// ─── Types & mock data ────────────────────────────────────────────────────────

interface Player {
  rang: number;
  pseudo: string;
  avatar: string;
  points: number;
  eloChange: number;
  country: string;
  isCurrentUser?: boolean;
}

const mockResultats: Player[] = [
  { rang: 1, pseudo: "PolyWarrior",  avatar: "PW", points: 87, eloChange:  62, country: "US" },
  { rang: 2, pseudo: "BlenderKing",  avatar: "BK", points: 71, eloChange:  41, country: "FR" },
  { rang: 3, pseudo: "MeshMaster",   avatar: "MM", points: 54, eloChange:  18, country: "DE" },
  { rang: 4, pseudo: "Toi",          avatar: "TO", points: 38, eloChange:  -5, country: "FR", isCurrentUser: true },
];

// Podium order: 2nd left · 1st centre · 3rd right
const podiumOrder = [2, 1, 3].map((r) => mockResultats.find((p) => p.rang === r)!);

const AVATAR_COLORS = ["#ff2e2e", "#2e6bff", "#0aa36b", "#c026d3", "#ff9500"];
const avatarColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultatsPage() {
  const router = useRouter();

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-12">

        {/* ── Title ── */}
        <h1
          className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center leading-none"
          style={{ fontSize: "52px", textShadow: "4px 4px 0 #ff2e2e" }}
        >
          RESULTATS
        </h1>

        {/* ── Podium ── */}
        <section className="relative">
          {/* Decorative background text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <span
              className="font-bangers select-none animate-badge-pop"
              style={{
                fontSize: "clamp(120px, 25vw, 200px)",
                color: "#ff2e2e",
                opacity: 0.05,
                transform: "rotate(-8deg)",
                lineHeight: 1,
              }}
            >
              GG!
            </span>
          </div>

          {/* Steps */}
          <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-4">
            {podiumOrder.map((player, idx) => (
              <PodiumColumn key={player.rang} player={player} colorIdx={idx} />
            ))}
          </div>
        </section>

        {/* ── Full ranking table ── */}
        <section>
          <h2 className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a] mb-4"
            style={{ borderLeft: "5px solid #ff2e2e", paddingLeft: "14px" }}>
            CLASSEMENT COMPLET
          </h2>

          <div
            className="border-[5px] border-[#1a1a1a] rounded-[16px] overflow-hidden"
            style={{ boxShadow: "6px 6px 0 #1a1a1a" }}
          >
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ backgroundColor: "#1a1a1a" }}>
                  {["RANG", "JOUEUR", "POINTS", "GAIN ELO"].map((col) => (
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
                {mockResultats.map((row, idx) => (
                  <TableRow key={row.rang} row={row} colorIdx={idx} isLast={idx === mockResultats.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA buttons ── */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            variant="primary"
            onClick={() => router.push("/jouer")}
            className="!text-2xl !px-10 !py-3 !rounded-[14px]"
          >
            REJOUER
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/profil")}
            className="!text-2xl !px-10 !py-3 !rounded-[14px]"
          >
            VOIR MON PROFIL
          </Button>
        </div>

      </div>
    </main>
  );
}

// ─── Podium column ────────────────────────────────────────────────────────────

const STEP = {
  1: { h: 140, avatarPx: 80, fontSize: "22px", stepBg: "#ffd400" },
  2: { h: 96,  avatarPx: 64, fontSize: "17px", stepBg: "#ffffff" },
  3: { h: 64,  avatarPx: 56, fontSize: "15px", stepBg: "#ffffff" },
} as const;

function PodiumColumn({ player, colorIdx }: { player: Player; colorIdx: number }) {
  const isFirst = player.rang === 1;
  const cfg = STEP[player.rang as 1 | 2 | 3];

  return (
    <div className="flex flex-col items-center flex-1 max-w-[180px]">
      {/* WINNER badge (1st only) */}
      {isFirst && (
        <span
          className="font-bangers uppercase tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-3 py-1 mb-2 animate-badge-pop"
          style={{
            borderRadius: "8px",
            fontSize: "18px",
            boxShadow: "3px 3px 0 #1a1a1a",
            transform: "rotate(-3deg)",
          }}
        >
          WINNER
        </span>
      )}

      {/* Avatar */}
      <div
        className="rounded-full border-[4px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white shrink-0"
        style={{
          width: cfg.avatarPx,
          height: cfg.avatarPx,
          fontSize: cfg.fontSize,
          backgroundColor: avatarColor(colorIdx),
          boxShadow: "3px 3px 0 #1a1a1a",
        }}
      >
        {player.avatar}
      </div>

      {/* Pseudo */}
      <p
        className="font-archivo-black text-[#1a1a1a] text-center mt-2 leading-tight px-1 truncate w-full text-center"
        style={{ fontSize: isFirst ? "14px" : "12px" }}
      >
        {player.pseudo}
      </p>

      {/* Country badge */}
      <span
        className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-1.5 py-0.5 mt-1 uppercase"
        style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
      >
        {player.country}
      </span>

      {/* Points */}
      <p className="font-bangers text-[#1a1a1a] mt-1 leading-none" style={{ fontSize: "20px" }}>
        {player.points} PTS
      </p>

      {/* Podium step */}
      <div
        className="w-full mt-3 border-[4px] border-[#1a1a1a] flex items-center justify-center"
        style={{
          height: cfg.h,
          backgroundColor: cfg.stepBg,
          borderRadius: "10px 10px 0 0",
          boxShadow: "4px 0 0 #1a1a1a, -0px 0 0 #1a1a1a",
        }}
      >
        <span
          className="font-bangers text-[#1a1a1a] leading-none"
          style={{ fontSize: "56px", opacity: isFirst ? 1 : 0.15 }}
        >
          {player.rang}
        </span>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({
  row,
  colorIdx,
  isLast,
}: {
  row: Player;
  colorIdx: number;
  isLast: boolean;
}) {
  const highlight = row.isCurrentUser;

  const cellBase = `px-4 py-3 ${isLast ? "" : "border-b-[3px] border-b-[#1a1a1a]/10"}`;
  const rowBg = highlight ? "#fff7cc" : colorIdx % 2 === 0 ? "#ffffff" : "#fafafa";

  return (
    <tr style={{ backgroundColor: rowBg }}>
      {/* Rang */}
      <td
        className={cellBase}
        style={{
          borderLeft: highlight ? "5px solid #ff2e2e" : "5px solid transparent",
        }}
      >
        <span className="font-bangers text-2xl text-[#1a1a1a]">
          {row.rang}
        </span>
      </td>

      {/* Joueur */}
      <td className={cellBase}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full border-[3px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white text-xs shrink-0"
            style={{ backgroundColor: avatarColor(colorIdx) }}
          >
            {row.avatar}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-archivo-black text-sm text-[#1a1a1a] truncate">
              {row.pseudo}
            </span>
            {highlight && (
              <span
                className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]"
              >
                VOUS
              </span>
            )}
          </div>

          {/* Country */}
          <span
            className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-1.5 py-0.5 uppercase shrink-0 ml-auto"
            style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
          >
            {row.country}
          </span>
        </div>
      </td>

      {/* Points */}
      <td className={cellBase}>
        <span className="font-bangers text-xl text-[#1a1a1a]">
          {row.points}
        </span>
      </td>

      {/* ELO change */}
      <td className={cellBase}>
        <span
          className="font-archivo-black text-sm"
          style={{ color: row.eloChange >= 0 ? "#0aa36b" : "#ff2e2e" }}
        >
          {row.eloChange >= 0 ? "+" : ""}
          {row.eloChange} ELO
        </span>
      </td>
    </tr>
  );
}
