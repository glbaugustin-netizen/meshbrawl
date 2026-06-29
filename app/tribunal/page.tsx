"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const ADMIN_ID = "14f2b93c-1b7d-4806-822e-d687ea944bef";

interface Case {
  id:          string;
  userId:      string;
  pseudo:      string;
  avatarColor: string | null;
  banReason:   string | null;
  argument:    string;
  createdAt:   string;
  banCount:    number;
  debanCount:  number;
  myVote:      "ban" | "deban" | null;
  isMine:      boolean;
}

export default function TribunalPage() {
  const [loading,  setLoading]  = useState(true);
  const [authed,   setAuthed]   = useState(false);
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [cases,    setCases]    = useState<Case[]>([]);
  const [voting,   setVoting]   = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tribunal", { cache: "no-store" });
    if (res.status === 401) { setAuthed(false); return; }
    setAuthed(true);
    const data = await res.json();
    setCases(data.cases ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(session?.user?.id === ADMIN_ID);
      await load().catch(() => {});
      setLoading(false);
    })();
  }, [load]);

  const vote = async (caseId: string, choice: "ban" | "deban") => {
    setVoting(caseId);
    try {
      const res = await fetch("/api/tribunal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ caseId, vote: choice }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status !== 409) alert(data.error ?? "Erreur");
      }
      await load().catch(() => {});
    } finally {
      setVoting(null);
    }
  };

  const removeCase = async (caseId: string) => {
    await fetch("/api/dev/tribunal", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ caseId }),
    }).catch(() => {});
    await load().catch(() => {});
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/40">Chargement...</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center flex flex-col items-center gap-5">
          <Gavel size={56} />
          <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a]" style={{ fontSize: "40px" }}>
            TRIBUNAL DES BANNIS
          </h1>
          <p className="font-archivo text-sm text-[#1a1a1a]/70" style={{ fontWeight: 600 }}>
            Connecte-toi pour juger les bannis.
          </p>
          <Link
            href="/auth"
            className="font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] px-8 py-3"
            style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "20px" }}
          >
            SE CONNECTER
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="text-center flex flex-col items-center gap-3">
          <Gavel size={52} />
          <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a]" style={{ fontSize: "clamp(36px, 8vw, 56px)", textShadow: "4px 4px 0 #ff2e2e" }}>
            TRIBUNAL DES BANNIS
          </h1>
          <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/50">
            La communauté juge. Un seul vote par cas.
          </p>
        </div>

        {cases.length === 0 ? (
          <div
            className="text-center py-20 bg-white"
            style={{ border: "4px solid #1a1a1a", borderRadius: "14px", boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/40">
              Aucun cas à juger pour l&apos;instant
            </p>
          </div>
        ) : (
          cases.map((c) => {
            const total    = c.banCount + c.debanCount;
            const banPct   = total ? Math.round((c.banCount / total) * 100) : 0;
            const debanPct = total ? 100 - banPct : 0;
            const voted    = c.myVote !== null;
            const locked   = c.isMine || voted || voting === c.id;

            return (
              <div
                key={c.id}
                className="bg-white p-6 flex flex-col gap-5"
                style={{ border: "5px solid #1a1a1a", borderRadius: "18px", boxShadow: "6px 6px 0 #1a1a1a" }}
              >
                {/* Accusé */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-12 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: c.avatarColor ?? "#ccc", border: "3px solid #1a1a1a" }}
                    />
                    <div className="flex flex-col">
                      <span className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "24px" }}>
                        {c.pseudo}
                      </span>
                      <span className="font-archivo text-[10px] uppercase tracking-widest text-[#1a1a1a]/40" style={{ fontWeight: 700 }}>
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => removeCase(c.id)}
                      className="font-archivo-black text-[9px] uppercase tracking-widest text-[#1a1a1a]/50 underline underline-offset-2 hover:text-[#ff2e2e] transition-colors"
                    >
                      Retirer
                    </button>
                  )}
                </div>

                {/* Chef d'accusation */}
                <div className="flex flex-col gap-1.5 p-4" style={{ backgroundColor: "#fff7f7", border: "3px solid #1a1a1a", borderRadius: "12px" }}>
                  <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]">
                    Chef d&apos;accusation
                  </span>
                  <p className="font-archivo text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap" style={{ fontWeight: 600 }}>
                    {c.banReason?.trim() ? c.banReason : "Aucune raison précisée."}
                  </p>
                </div>

                {/* Défense */}
                <div className="flex flex-col gap-1.5 p-4" style={{ backgroundColor: "#f3f7ff", border: "3px solid #1a1a1a", borderRadius: "12px" }}>
                  <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#2e6bff]">
                    La défense
                  </span>
                  <p className="font-archivo text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap" style={{ fontWeight: 600 }}>
                    {c.argument}
                  </p>
                </div>

                {/* Verdict */}
                {c.isMine ? (
                  <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/40 text-center">
                    Tu ne peux pas juger ton propre cas
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <VoteButton
                        label="BANNIR"
                        pct={banPct}
                        color="#ff2e2e"
                        active={c.myVote === "ban"}
                        dim={voted && c.myVote !== "ban"}
                        disabled={locked}
                        onClick={() => vote(c.id, "ban")}
                      />
                      <VoteButton
                        label="GRACIER"
                        pct={debanPct}
                        color="#0aa36b"
                        active={c.myVote === "deban"}
                        dim={voted && c.myVote !== "deban"}
                        disabled={locked}
                        onClick={() => vote(c.id, "deban")}
                      />
                    </div>
                    <p className="font-archivo text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 text-center" style={{ fontWeight: 700 }}>
                      {voted ? `Ton verdict est rendu — ${total} vote${total > 1 ? "s" : ""}` : `${total} vote${total > 1 ? "s" : ""}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

// ─── Bouton de vote ───────────────────────────────────────────────────────────

function VoteButton({
  label, pct, color, active, dim, disabled, onClick,
}: {
  label: string; pct: number; color: string;
  active: boolean; dim: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 relative overflow-hidden font-bangers uppercase tracking-widest border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 disabled:cursor-default"
      style={{
        borderRadius: "12px",
        boxShadow: active ? `0 3px 0 #1a1a1a` : `0 5px 0 #1a1a1a`,
        backgroundColor: "#fff",
        opacity: dim ? 0.55 : 1,
        transform: active ? "translateY(2px)" : undefined,
      }}
    >
      {/* Barre de remplissage proportionnelle au % */}
      <span
        className="absolute inset-0 transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: active ? 0.85 : 0.25 }}
      />
      <span className="relative flex items-center justify-center gap-2" style={{ color: "#1a1a1a", fontSize: "18px" }}>
        {label}
        <span style={{ fontSize: "15px" }}>{pct}%</span>
      </span>
    </button>
  );
}

// ─── Icône marteau de juge ──────────────────────────────────────────────────────

function Gavel({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </svg>
  );
}
