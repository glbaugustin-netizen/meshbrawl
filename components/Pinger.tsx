"use client";

import { useEffect } from "react";

// Envoie un ping last_seen toutes les 15s depuis n'importe quelle page.
// Monté dans le layout racine pour couvrir /jeu et /vote où la Navbar est cachée.
export default function Pinger() {
  useEffect(() => {
    fetch("/api/users/ping", { method: "POST" }).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/users/ping", { method: "POST" }).catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
