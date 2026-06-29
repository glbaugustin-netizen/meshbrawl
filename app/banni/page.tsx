"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function BanniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reason,  setReason]  = useState<string | null>(null);

  // Demande de déban
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [reqError,  setReqError]  = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/users/ban-status", { cache: "no-store" });
        const data = await res.json();
        // Pas banni → on n'a rien à faire ici
        if (!data.banned) { router.replace("/"); return; }
        setReason(data.reason ?? null);

        // Pré-remplit si une demande existe déjà
        const reqRes  = await fetch("/api/unban-requests", { cache: "no-store" });
        const reqData = await reqRes.json();
        if (reqData.exists) {
          setMessage(reqData.message ?? "");
          setSent(true);
        }
      } catch {
        // En cas d'erreur on reste sur la page de ban (fail-safe)
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setReqError("");
    try {
      const res = await fetch("/api/unban-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReqError(data.error ?? "Erreur"); return; }
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/40">
          Chargement...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md flex flex-col gap-6 bg-white p-8 text-center"
        style={{ border: "5px solid #1a1a1a", borderRadius: "18px", boxShadow: "7px 7px 0 #ff2e2e" }}
      >
        <span
          className="font-archivo-black text-xs uppercase tracking-widest text-white bg-[#ff2e2e] px-5 py-2 inline-block self-center"
          style={{ borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a", transform: "rotate(-2deg)" }}
        >
          ACCÈS BLOQUÉ
        </span>

        <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "46px", textShadow: "3px 3px 0 #ff2e2e" }}>
          TU ES BANNI
        </h1>

        <p className="font-archivo text-sm text-[#1a1a1a]/70 leading-relaxed" style={{ fontWeight: 600 }}>
          Ton compte a été suspendu et tu ne peux plus rejoindre de parties.
        </p>

        {/* Raison du ban */}
        <div
          className="flex flex-col gap-2 p-5 text-left"
          style={{ backgroundColor: "#fff7f7", border: "3px solid #1a1a1a", borderRadius: "12px" }}
        >
          <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e]">
            Raison
          </span>
          <p className="font-archivo text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap" style={{ fontWeight: 600 }}>
            {reason?.trim() ? reason : "Aucune raison précisée."}
          </p>
        </div>

        {/* Demande de déban */}
        <div className="flex flex-col gap-3 text-left">
          <label className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]">
            Faire une demande de déban
          </label>
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setSent(false); }}
            rows={4}
            maxLength={500}
            placeholder="Explique pourquoi ton compte devrait être débanni..."
            className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none resize-none"
            style={{ fontWeight: 600, fontSize: "14px", padding: "12px 14px", border: "4px solid #1a1a1a", borderRadius: "11px", boxShadow: "3px 3px 0 #1a1a1a" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2e6bff"; e.currentTarget.style.boxShadow = "3px 3px 0 #2e6bff"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; }}
          />
          {reqError && (
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#ff2e2e]">{reqError}</p>
          )}
          {sent && !reqError && (
            <p className="font-archivo-black text-xs uppercase tracking-widest text-[#0aa36b]">
              ✓ Demande envoyée — un admin va l&apos;examiner
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "18px" }}
          >
            {sending ? "ENVOI..." : sent ? "METTRE À JOUR MA DEMANDE" : "ENVOYER MA DEMANDE"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/50 underline underline-offset-2 hover:text-[#ff2e2e] transition-colors self-center"
        >
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
