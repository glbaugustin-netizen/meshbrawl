"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Envoie un ping last_seen toutes les 15s depuis n'importe quelle page.
// Monté dans le layout racine pour couvrir /jeu et /vote où la Navbar est cachée.
// Le ping renvoie aussi le statut "banni" : si l'utilisateur est banni, on le
// redirige vers /banni (sauf s'il y est déjà).
export default function Pinger() {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const ping = async () => {
      try {
        const res  = await fetch("/api/users/ping", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data?.banned && pathname !== "/banni") {
          router.replace("/banni");
        }
      } catch {}
    };
    ping();
    const interval = setInterval(ping, 15_000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}
