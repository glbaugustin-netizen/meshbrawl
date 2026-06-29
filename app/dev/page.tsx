"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Player {
  id:             string;
  pseudo:         string;
  avatar_color:   string | null;
  elo:            number;
  country:        string | null;
  parties_jouees: number;
  last_seen:      string;
  twitch:         string | null;
  game:           { mode: string; status: string } | null;
  online:         boolean;
  banned:         boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}min`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DevPage() {
  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const [players,   setPlayers]   = useState<Player[]>([]);
  const [serverNow, setServerNow] = useState(Date.now());
  const [search,    setSearch]    = useState("");
  const [banTarget, setBanTarget] = useState<Player | null>(null);
  const [banning,   setBanning]   = useState(false);
  const pwRef       = useRef("");
  const searchRef   = useRef("");

  // Récupère la liste (le mot de passe validé est gardé en mémoire). Le terme
  // de recherche, s'il est rempli, cherche dans TOUS les joueurs côté serveur.
  const fetchPlayers = useCallback(async (pw: string, term: string) => {
    const res = await fetch("/api/dev/players", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: pw, search: term }),
      cache:   "no-store",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Erreur");
    }
    const data = await res.json();
    setPlayers(data.players ?? []);
    setServerNow(data.serverNow ?? Date.now());
  }, []);

  const handleLogin = async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      await fetchPlayers(pw, "");
      pwRef.current = pw;
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  // Recherche débouncée : relance la requête 350ms après la dernière frappe
  useEffect(() => {
    if (!authed) return;
    searchRef.current = search;
    const t = setTimeout(() => {
      fetchPlayers(pwRef.current, search).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [search, authed, fetchPlayers]);

  // Auto-refresh toutes les 10s une fois authentifié (respecte la recherche)
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      fetchPlayers(pwRef.current, searchRef.current).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [authed, fetchPlayers]);

  // Bannit / débannit le joueur ciblé par le modal de confirmation
  const confirmBan = async () => {
    if (!banTarget) return;
    setBanning(true);
    try {
      const res = await fetch("/api/dev/ban", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          password: pwRef.current,
          userId:   banTarget.id,
          banned:   !banTarget.banned,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Erreur");
      } else {
        await fetchPlayers(pwRef.current, searchRef.current).catch(() => {});
        setBanTarget(null);
      }
    } finally {
      setBanning(false);
    }
  };

  // ── Écran mot de passe ──
  if (!authed) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleLogin(password); }}
          className="w-full max-w-sm flex flex-col gap-5 bg-white p-8"
          style={{ border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #1a1a1a" }}
        >
          <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center" style={{ fontSize: "34px" }}>
            ZONE DEV
          </h1>
          <p className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/50 text-center">
            Réservé au compte dev — mot de passe requis
          </p>
          {error && (
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#ff2e2e] text-center">{error}</p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe..."
            autoFocus
            className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none"
            style={{ fontWeight: 700, fontSize: "15px", padding: "13px 16px", border: "4px solid #1a1a1a", borderRadius: "11px", boxShadow: "3px 3px 0 #1a1a1a" }}
          />
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "20px" }}
          >
            {loading ? "..." : "ENTRER"}
          </button>
        </form>
      </main>
    );
  }

  // ── Tableau de bord ──
  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a]" style={{ fontSize: "38px" }}>
            {search.trim() ? "RECHERCHE" : "JOUEURS EN LIGNE"}
          </h1>
          <span
            className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] px-4 py-2"
            style={{ border: "3px solid #1a1a1a", borderRadius: "10px", boxShadow: "3px 3px 0 #1a1a1a" }}
          >
            {players.length} {search.trim() ? "RÉSULTAT" + (players.length > 1 ? "S" : "") : "EN LIGNE"}
          </span>
        </div>

        {/* Barre de recherche — cherche par pseudo dans TOUS les joueurs */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a1a1a]/40 pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur par pseudo..."
            className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none"
            style={{ fontWeight: 700, fontSize: "15px", padding: "13px 16px 13px 44px", border: "4px solid #1a1a1a", borderRadius: "12px", boxShadow: "3px 3px 0 #1a1a1a" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#ff2e2e"; e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-bangers text-[#1a1a1a] hover:text-[#ff2e2e] transition-colors"
              style={{ fontSize: "22px", lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>

        {players.length === 0 ? (
          <div
            className="text-center py-20 bg-white"
            style={{ border: "4px solid #1a1a1a", borderRadius: "14px", boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/40">
              {search.trim() ? "Aucun joueur trouvé" : "Personne en ligne pour l'instant"}
            </p>
          </div>
        ) : (
          <div
            className="bg-white overflow-x-auto"
            style={{ border: "4px solid #1a1a1a", borderRadius: "14px", boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] text-[#ffd400]">
                  {["PSEUDO", "ELO", "PAYS", "PARTIES", "STATUT", "VU IL Y A", "ACTION"].map((h) => (
                    <th key={h} className="font-archivo-black text-[10px] uppercase tracking-widest px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: i === 0 ? "none" : "2px solid #1a1a1a15" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative shrink-0">
                          <span
                            className="w-7 h-7 rounded-full block"
                            style={{ backgroundColor: p.avatar_color ?? "#ccc", border: "2px solid #1a1a1a" }}
                          />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.online ? "#0aa36b" : "#9ca3af", border: "2px solid #fff" }}
                            title={p.online ? "En ligne" : "Hors ligne"}
                          />
                        </span>
                        <span className="font-archivo-black text-sm text-[#1a1a1a] truncate max-w-[160px]">
                          {p.pseudo}
                          {p.twitch && (
                            <span className="font-archivo text-[10px] text-[#9146FF] ml-2 normal-case" style={{ fontWeight: 700 }}>
                              @{p.twitch}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-archivo-black text-sm text-[#1a1a1a]">{p.elo}</td>
                    <td className="px-4 py-3 font-archivo text-sm text-[#1a1a1a]/70" style={{ fontWeight: 600 }}>
                      {p.country ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-archivo text-sm text-[#1a1a1a]/70" style={{ fontWeight: 600 }}>
                      {p.parties_jouees}
                    </td>
                    <td className="px-4 py-3">
                      {p.banned ? (
                        <span
                          className="font-archivo-black text-[9px] uppercase tracking-widest text-white bg-[#1a1a1a] px-2 py-1 inline-block"
                          style={{ borderRadius: "6px" }}
                        >
                          BANNI
                        </span>
                      ) : p.game ? (
                        <span
                          className="font-archivo-black text-[9px] uppercase tracking-widest text-white bg-[#ff2e2e] px-2 py-1 inline-block"
                          style={{ borderRadius: "6px" }}
                        >
                          {p.game.mode} · {p.game.status}
                        </span>
                      ) : (
                        <span
                          className="font-archivo-black text-[9px] uppercase tracking-widest text-[#0aa36b] bg-[#0aa36b]/10 px-2 py-1 inline-block"
                          style={{ borderRadius: "6px" }}
                        >
                          LIBRE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-archivo text-xs text-[#1a1a1a]/50" style={{ fontWeight: 600 }}>
                      {ago(p.last_seen, serverNow)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setBanTarget(p)}
                        className="font-archivo-black text-[9px] uppercase tracking-widest px-3 py-1.5 transition-all duration-100 hover:-translate-y-[1px]"
                        style={{
                          border: "2px solid #1a1a1a",
                          borderRadius: "7px",
                          boxShadow: "2px 2px 0 #1a1a1a",
                          backgroundColor: p.banned ? "#0aa36b" : "#ff2e2e",
                          color: "#fff",
                        }}
                      >
                        {p.banned ? "DÉBANNIR" : "BANNIR"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-archivo text-[10px] uppercase tracking-widest text-[#1a1a1a]/30 text-center">
          Rafraîchissement auto toutes les 10s
        </p>
      </div>

      {/* Modal de confirmation ban / déban */}
      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(26,26,26,0.6)" }}
          onClick={() => !banning && setBanTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white p-7 flex flex-col gap-5"
            style={{ border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #1a1a1a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bangers uppercase tracking-widest text-[#1a1a1a] text-center" style={{ fontSize: "30px" }}>
              {banTarget.banned ? "DÉBANNIR ?" : "BANNIR ?"}
            </h2>
            <p className="font-archivo text-sm text-[#1a1a1a]/80 text-center leading-relaxed" style={{ fontWeight: 600 }}>
              {banTarget.banned ? (
                <>Redonner l&apos;accès aux parties à <span className="font-archivo-black text-[#1a1a1a]">{banTarget.pseudo}</span> ?</>
              ) : (
                <><span className="font-archivo-black text-[#ff2e2e]">{banTarget.pseudo}</span> ne pourra plus rejoindre aucune partie.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                disabled={banning}
                className="flex-1 font-bangers uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] py-2.5 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-50"
                style={{ borderRadius: "12px", boxShadow: "0 4px 0 #1a1a1a", fontSize: "17px" }}
              >
                ANNULER
              </button>
              <button
                type="button"
                onClick={confirmBan}
                disabled={banning}
                className="flex-1 font-bangers uppercase tracking-widest text-white border-[4px] border-[#1a1a1a] py-2.5 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-50"
                style={{ borderRadius: "12px", boxShadow: "0 4px 0 #1a1a1a", fontSize: "17px", backgroundColor: banTarget.banned ? "#0aa36b" : "#ff2e2e" }}
              >
                {banning ? "..." : banTarget.banned ? "DÉBANNIR" : "BANNIR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
