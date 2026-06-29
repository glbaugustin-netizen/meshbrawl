"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function BanniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reason,  setReason]  = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/users/ban-status", { cache: "no-store" });
        const data = await res.json();
        // Pas banni → on n'a rien à faire ici
        if (!data.banned) { router.replace("/"); return; }
        setReason(data.reason ?? null);
      } catch {
        // En cas d'erreur on reste sur la page de ban (fail-safe)
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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

        <p className="font-archivo text-xs text-[#1a1a1a]/50 leading-relaxed" style={{ fontWeight: 600 }}>
          Tu penses que c&apos;est une erreur ? Contacte-nous à{" "}
          <a href="mailto:glbaugustin@gmail.com?subject=Contestation%20de%20ban%20MeshBrawl" className="underline text-[#2e6bff]">
            glbaugustin@gmail.com
          </a>
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
          style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "18px" }}
        >
          SE DÉCONNECTER
        </button>
      </div>
    </main>
  );
}
