"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnlineCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const supabase = createClient();

  const fetchCount = async () => {
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: c } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", since);
    if (c !== null) setCount(c);
  };

  useEffect(() => {
    fetch("/api/users/ping", { method: "POST" }).catch(() => {});
    fetchCount();

    const interval = setInterval(() => {
      fetch("/api/users/ping", { method: "POST" }).catch(() => {});
      fetchCount();
    }, 15_000);

    const channel = supabase
      .channel('online-users')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full border-2 border-[#1a1a1a] animate-blink-dot"
        style={{ backgroundColor: "#0aa36b" }}
      />
      <span className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">
        {count.toLocaleString("fr-FR")} BRAWLERS EN LIGNE
      </span>
    </div>
  );
}
