"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Newsletter {
  id:         string;
  title:      string;
  content:    string;
  created_at: string;
}

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  isAdmin:  boolean;
  onNewsletter: (latest: string | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsletterPanel({ isOpen, onClose, isAdmin, onNewsletter }: Props) {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [selected,    setSelected]    = useState<Newsletter | null>(null);
  const [writing,     setWriting]     = useState(false);
  const [title,       setTitle]       = useState('');
  const [content,     setContent]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [error,       setError]       = useState('');

  // Charge les newsletters
  const load = async () => {
    const res = await fetch('/api/newsletters', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const list: Newsletter[] = data.newsletters ?? [];
    setNewsletters(list);
    onNewsletter(list[0]?.created_at ?? null);
  };

  // Charge au montage puis re-vérifie périodiquement → le badge non-lu
  // s'allume automatiquement quand une nouvelle newsletter est publiée,
  // sans que l'utilisateur ait à rafraîchir la page.
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset vue article quand on ferme
  useEffect(() => {
    if (!isOpen) { setSelected(null); setWriting(false); }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/newsletters', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, content }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return; }
    setTitle('');
    setContent('');
    setWriting(false);
    setSaving(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
    setDeleting(null);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(26,26,26,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: "420px",
          backgroundColor: "#fff",
          borderLeft: "5px solid #1a1a1a",
          boxShadow: "-6px 0 0 #1a1a1a",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "4px solid #1a1a1a", backgroundColor: "#1a1a1a" }}
        >
          <div className="flex items-center gap-3">
            <IconMegaphone />
            <h2 className="font-bangers uppercase tracking-widest text-[#ffd400] leading-none" style={{ fontSize: "24px" }}>
              ACTUALITÉS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-bangers text-[#ffd400] hover:text-[#ff2e2e] transition-colors duration-100"
            style={{ fontSize: "28px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Vue article */}
          {selected ? (
            <div className="flex flex-col h-full">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/60 hover:text-[#ff2e2e] transition-colors px-6 pt-5 pb-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                RETOUR
              </button>
              <div className="px-6 pb-6 flex flex-col gap-4">
                <p className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/40">
                  {formatDate(selected.created_at)}
                </p>
                <h3 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-tight" style={{ fontSize: "28px" }}>
                  {selected.title}
                </h3>
                <div
                  className="font-archivo text-[#1a1a1a] text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ fontWeight: 600 }}
                >
                  {selected.content}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selected.id)}
                    disabled={deleting === selected.id}
                    className="font-archivo-black text-xs uppercase tracking-widest text-[#ff2e2e] underline underline-offset-2 hover:opacity-70 transition-opacity self-start disabled:opacity-40"
                  >
                    {deleting === selected.id ? 'SUPPRESSION...' : 'SUPPRIMER CET ARTICLE'}
                  </button>
                )}
              </div>
            </div>
          ) : writing ? (
            /* Formulaire de création */
            <div className="px-6 py-5 flex flex-col gap-4">
              <h3 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "24px" }}>
                NOUVELLE NEWS
              </h3>
              {error && (
                <p className="font-archivo-black text-xs uppercase tracking-widest text-[#ff2e2e]">{error}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="font-archivo-black text-[#1a1a1a] uppercase text-xs tracking-widest">TITRE</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Titre de l'article..."
                  className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none"
                  style={{ fontWeight: 700, fontSize: "15px", padding: "12px 14px", border: "4px solid #1a1a1a", borderRadius: "10px", boxShadow: "3px 3px 0 #1a1a1a" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#ff2e2e"; e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-archivo-black text-[#1a1a1a] uppercase text-xs tracking-widest">CONTENU</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  placeholder="Écris ton article ici..."
                  className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none resize-none"
                  style={{ fontWeight: 600, fontSize: "14px", padding: "12px 14px", border: "4px solid #1a1a1a", borderRadius: "10px", boxShadow: "3px 3px 0 #1a1a1a" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#ff2e2e"; e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !title.trim() || !content.trim()}
                  className="flex-1 font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "18px" }}
                >
                  {saving ? 'ENVOI...' : 'PUBLIER'}
                </button>
                <button
                  type="button"
                  onClick={() => { setWriting(false); setError(''); setTitle(''); setContent(''); }}
                  className="flex-1 font-bangers uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
                  style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "18px" }}
                >
                  ANNULER
                </button>
              </div>
            </div>
          ) : (
            /* Liste des articles */
            <div className="flex flex-col gap-0">
              {isAdmin && (
                <div className="px-6 py-4" style={{ borderBottom: "3px solid #1a1a1a" }}>
                  <button
                    type="button"
                    onClick={() => setWriting(true)}
                    className="w-full font-bangers uppercase tracking-widest text-[#1a1a1a] bg-[#ffd400] border-[4px] border-[#1a1a1a] py-3 flex items-center justify-center gap-2 transition-all duration-100 hover:-translate-y-[2px]"
                    style={{ borderRadius: "12px", boxShadow: "0 5px 0 #1a1a1a", fontSize: "18px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    NOUVELLE NEWS
                  </button>
                </div>
              )}

              {newsletters.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
                  <IconMegaphone dimmed />
                  <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]/40">
                    Aucune actualité pour l&apos;instant
                  </p>
                </div>
              ) : (
                newsletters.map((n, i) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelected(n)}
                    className="w-full text-left px-6 py-5 flex flex-col gap-1.5 transition-colors duration-100 hover:bg-[#fffbe6]"
                    style={{ borderBottom: i < newsletters.length - 1 ? "3px solid #1a1a1a" : undefined }}
                  >
                    <p className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/40">
                      {formatDate(n.created_at)}
                    </p>
                    <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-tight" style={{ fontSize: "20px" }}>
                      {n.title}
                    </p>
                    <p className="font-archivo text-xs text-[#1a1a1a]/60 leading-relaxed line-clamp-2" style={{ fontWeight: 600 }}>
                      {n.content}
                    </p>
                    <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#ff2e2e] mt-1">
                      LIRE →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconMegaphone({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={dimmed ? "#1a1a1a40" : "#ffd400"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}
