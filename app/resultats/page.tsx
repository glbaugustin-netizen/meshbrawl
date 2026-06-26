"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  rang:          number;
  pseudo:        string;
  avatar:        string;
  points:        number;
  eloChange:     number;
  country:       string;
  avatarColor:   string;
  isCurrentUser: boolean;
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function ResultatsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResultatsPageInner />
    </Suspense>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function ResultatsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const gameId       = searchParams.get('gameId');
  const supabase     = createClient();

  const [resultats, setResultats] = useState<Player[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Déclenche le calcul ELO (idempotent — no-op si déjà fait)
        fetch(`/api/games/${gameId}/calculate-elo`, { method: 'POST' }).catch(() => {});

        // Attend que le calcul ELO soit terminé (max 15s)
        let attempts = 0;
        while (attempts < 10) {
          const { data: game } = await supabase
            .from('games')
            .select('status')
            .eq('id', gameId)
            .single();
          if (game?.status === 'finished') break;
          await new Promise((r) => setTimeout(r, 1500));
          attempts++;
        }

        // Charge les résultats
        const { data, error: err } = await supabase
          .from('game_players')
          .select(`
            id,
            rank,
            points_received,
            elo_change,
            user_id,
            users (
              pseudo,
              avatar_color,
              country
            )
          `)
          .eq('game_id', gameId)
          .order('rank', { ascending: true });

        if (err) { setError(err.message); setLoading(false); return; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Player[] = (data ?? []).map((gp: any) => ({
          rang:          gp.rank          ?? 99,
          pseudo:        gp.users?.pseudo ?? 'Joueur',
          avatar:        (gp.users?.pseudo ?? '??').slice(0, 2).toUpperCase(),
          points:        gp.points_received ?? 0,
          eloChange:     gp.elo_change      ?? 0,
          country:       gp.users?.country  ?? '??',
          avatarColor:   gp.users?.avatar_color ?? '#8a3ffc',
          isCurrentUser: gp.user_id === user?.id,
        }));

        setResultats(mapped);
      } catch (e) {
        console.error(e);
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-bangers uppercase tracking-widest text-[#ff2e2e]" style={{ fontSize: "36px" }}>
            ERREUR
          </p>
          <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/60">{error}</p>
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

  if (!gameId || resultats.length === 0) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p
            className="font-bangers uppercase tracking-widest text-[#1a1a1a]"
            style={{ fontSize: "36px", textShadow: "3px 3px 0 #ff2e2e" }}
          >
            RESULTATS INTROUVABLES
          </p>
          <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/50">
            Impossible de charger les résultats de cette partie.
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

  // Podium order: 2nd left · 1st centre · 3rd right
  const top3 = [2, 1, 3]
    .map((r) => resultats.find((p) => p.rang === r))
    .filter((p): p is Player => p !== undefined);

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

          <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-4">
            {top3.map((player) => (
              <PodiumColumn key={player.rang} player={player} />
            ))}
          </div>
        </section>

        {/* ── Full ranking table ── */}
        <section>
          <h2
            className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a] mb-4"
            style={{ borderLeft: "5px solid #ff2e2e", paddingLeft: "14px" }}
          >
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
                {resultats.map((row, idx) => (
                  <TableRow
                    key={row.rang}
                    row={row}
                    isLast={idx === resultats.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA buttons ── */}
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => window.location.href = '/match'}
            className="font-bangers uppercase tracking-widest text-[#ffd400] bg-[#ff2e2e] border-[5px] border-[#1a1a1a] px-10 py-3 transition-all duration-100 hover:-translate-y-[3px]"
            style={{ fontSize: "28px", borderRadius: "14px", boxShadow: "0 8px 0 #1a1a1a" }}
          >
            REJOUER
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/profil'}
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] bg-white border-[5px] border-[#1a1a1a] px-10 py-3 transition-all duration-100 hover:-translate-y-[3px]"
            style={{ fontSize: "28px", borderRadius: "14px", boxShadow: "0 8px 0 #1a1a1a" }}
          >
            VOIR MON PROFIL
          </button>
        </div>

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

// ─── Podium column ────────────────────────────────────────────────────────────

const STEP = {
  1: { h: 140, avatarPx: 80, fontSize: "22px", stepBg: "#ffd400" },
  2: { h: 96,  avatarPx: 64, fontSize: "17px", stepBg: "#ffffff" },
  3: { h: 64,  avatarPx: 56, fontSize: "15px", stepBg: "#ffffff" },
} as const;

function PodiumColumn({ player }: { player: Player }) {
  const isFirst = player.rang === 1;
  const cfg     = STEP[player.rang as 1 | 2 | 3];

  return (
    <div className="flex flex-col items-center flex-1 max-w-[180px]">
      {isFirst && (
        <span
          className="font-bangers uppercase tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-3 py-1 mb-2 animate-badge-pop"
          style={{ borderRadius: "8px", fontSize: "18px", boxShadow: "3px 3px 0 #1a1a1a", transform: "rotate(-3deg)" }}
        >
          WINNER
        </span>
      )}

      <div
        className="rounded-full border-[4px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white shrink-0"
        style={{
          width: cfg.avatarPx,
          height: cfg.avatarPx,
          fontSize: cfg.fontSize,
          backgroundColor: player.avatarColor,
          boxShadow: "3px 3px 0 #1a1a1a",
        }}
      >
        {player.avatar}
      </div>

      <p
        className="font-archivo-black text-[#1a1a1a] text-center mt-2 leading-tight px-1 truncate w-full"
        style={{ fontSize: isFirst ? "14px" : "12px" }}
      >
        {player.pseudo}
      </p>

      {player.country && player.country !== '??' && (
        <span
          className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-1.5 py-0.5 mt-1 uppercase"
          style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
        >
          {player.country}
        </span>
      )}

      <p className="font-bangers text-[#1a1a1a] mt-1 leading-none" style={{ fontSize: "20px" }}>
        {player.points} PTS
      </p>

      <div
        className="w-full mt-3 border-[4px] border-[#1a1a1a] flex items-center justify-center"
        style={{
          height: cfg.h,
          backgroundColor: cfg.stepBg,
          borderRadius: "10px 10px 0 0",
          boxShadow: "4px 0 0 #1a1a1a",
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

function TableRow({ row, isLast }: { row: Player; isLast: boolean }) {
  const highlight = row.isCurrentUser;
  const cellBase  = `px-4 py-3 ${isLast ? "" : "border-b-[3px] border-b-[#1a1a1a]/10"}`;
  const rowBg     = highlight ? "#fff7cc" : row.rang % 2 === 0 ? "#fafafa" : "#ffffff";

  return (
    <tr style={{ backgroundColor: rowBg }}>
      <td
        className={cellBase}
        style={{ borderLeft: highlight ? "5px solid #ff2e2e" : "5px solid transparent" }}
      >
        <span className="font-bangers text-2xl text-[#1a1a1a]">{row.rang}</span>
      </td>

      <td className={cellBase}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border-[3px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white text-xs shrink-0"
            style={{ backgroundColor: row.avatarColor }}
          >
            {row.avatar}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-archivo-black text-sm text-[#1a1a1a] truncate">{row.pseudo}</span>
            {highlight && (
              <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]">
                VOUS
              </span>
            )}
          </div>

          {row.country && row.country !== '??' && (
            <span
              className="font-archivo-black text-[10px] text-[#1a1a1a] bg-[#ffd400] border-[2px] border-[#1a1a1a] px-1.5 py-0.5 uppercase shrink-0 ml-auto"
              style={{ borderRadius: "5px", boxShadow: "2px 2px 0 #1a1a1a" }}
            >
              {row.country}
            </span>
          )}
        </div>
      </td>

      <td className={cellBase}>
        <span className="font-bangers text-xl text-[#1a1a1a]">{row.points}</span>
      </td>

      <td className={cellBase}>
        <span
          className="font-archivo-black text-sm"
          style={{ color: row.eloChange >= 0 ? "#0aa36b" : "#ff2e2e" }}
        >
          {row.eloChange >= 0 ? "+" : ""}{row.eloChange} ELO
        </span>
      </td>
    </tr>
  );
}
