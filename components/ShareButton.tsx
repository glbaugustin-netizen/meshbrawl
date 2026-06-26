"use client";

import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url  = window.location.origin;
    const data = { title: "MeshBrawl", text: "Rejoins l'arène de modélisation 3D compétitive !", url };

    if (navigator.share) {
      try { await navigator.share(data); } catch {}
      return;
    }

    // Fallback : copier l'URL
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Partager MeshBrawl"
      className="w-14 h-14 flex items-center justify-center bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#ffd400] hover:-translate-y-2 transition-[colors,transform] duration-150 relative"
      style={{ boxShadow: "3px 3px 0 #1a1a1a", borderRadius: "10px" }}
    >
      {copied ? <IconCheck /> : <IconShare />}
      {copied && (
        <span
          className="absolute -top-9 left-1/2 -translate-x-1/2 font-archivo-black text-[10px] uppercase tracking-widest text-white bg-[#1a1a1a] px-2 py-1 whitespace-nowrap"
          style={{ borderRadius: "6px" }}
        >
          Copié !
        </span>
      )}
    </button>
  );
}

function IconShare() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6"  cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#0aa36b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
