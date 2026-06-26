"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id:         string;
  user_id:    string;
  pseudo:     string;
  content:    string;
  created_at: string;
}

interface Props {
  gameId:        string;
  currentUserId: string;
  currentPseudo: string;
}

export default function GameChat({ gameId, currentUserId, currentPseudo }: Props) {
  const supabase   = createClient();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread,   setUnread]   = useState(0);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  // Ref pour lire l'état "ouvert" dans la callback realtime (sinon valeur périmée)
  const openRef    = useRef(open);
  openRef.current  = open;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, user_id, pseudo, content, created_at')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    load();

    const channel = supabase
      .channel(`chat:${gameId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        // Déduplication : si déjà présent (ajout optimiste), on ignore
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        // Pastille uniquement pour les messages des AUTRES et si le chat est fermé
        if (msg.user_id !== currentUserId && !openRef.current) {
          setUnread((prev) => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Reset unread quand on ouvre
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        game_id: gameId,
        user_id: currentUserId,
        pseudo:  currentPseudo,
        content: text,
      })
      .select('id, user_id, pseudo, content, created_at')
      .single();

    if (error) {
      console.error('Erreur envoi message:', error.message);
      setInput(text); // on restaure le texte pour réessayer
    } else if (data) {
      // Ajout optimiste immédiat (le realtime dédupliquera via l'id)
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Overlay pour fermer en cliquant à côté */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panneau latéral gauche */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width:      "340px",
          backgroundColor: "#fff",
          borderRight:     "5px solid #1a1a1a",
          boxShadow:       open ? "8px 0 0 #1a1a1a" : "none",
          transform:       open ? "translateX(0)" : "translateX(-100%)",
          transition:      "transform 0.25s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-4 flex items-center justify-between shrink-0"
          style={{ backgroundColor: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-blink-dot"
              style={{ backgroundColor: "#0aa36b" }}
            />
            <h3 className="font-archivo-black text-xs uppercase tracking-widest text-[#ffd400]">
              CHAT DE LA PARTIE
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-bangers text-[#ffd400] hover:text-white transition-colors"
            style={{ fontSize: "22px", lineHeight: 1 }}
            aria-label="Fermer le chat"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="font-archivo text-xs text-[#1a1a1a]/30 uppercase tracking-widest text-center mt-6" style={{ fontWeight: 600 }}>
              Aucun message...
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="font-archivo-black text-[10px] uppercase tracking-widest text-[#1a1a1a]/50 mb-0.5 px-1">
                    {msg.pseudo}
                  </span>
                )}
                <div
                  className="font-archivo text-sm px-3 py-2 max-w-[85%] break-words"
                  style={{
                    fontWeight:      600,
                    backgroundColor: isMe ? "#ff2e2e" : "#f0f0f0",
                    color:           isMe ? "#fff" : "#1a1a1a",
                    borderRadius:    isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    border:          "2px solid #1a1a1a",
                    boxShadow:       "2px 2px 0 #1a1a1a",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 shrink-0 flex gap-2" style={{ borderTop: "3px solid #1a1a1a" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
            placeholder="Envoie un message..."
            className="flex-1 font-archivo bg-[#fafafa] text-[#1a1a1a] text-sm outline-none px-3 py-2 border-[3px] border-[#1a1a1a]"
            style={{ fontWeight: 600, borderRadius: "10px", boxShadow: "2px 2px 0 #1a1a1a" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="font-bangers uppercase tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-4 py-2 transition-all duration-100 hover:-translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ borderRadius: "10px", boxShadow: "0 4px 0 #8b0000", fontSize: "16px" }}
          >
            GO
          </button>
        </div>
      </div>

      {/* Bouton flottant bas-gauche — caché quand le panneau est ouvert */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 font-bangers uppercase tracking-widest text-[#ffd400] bg-[#1a1a1a] border-[4px] border-[#1a1a1a] px-5 py-3 transition-all duration-100 hover:-translate-y-[3px]"
        style={{
          display:      open ? 'none' : undefined,
          borderRadius: "14px",
          boxShadow:    "0 6px 0 #ff2e2e",
          fontSize:     "18px",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 9px 0 #ff2e2e"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 0 #ff2e2e"; }}
        onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 0 #ff2e2e"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(4px)"; }}
        onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 9px 0 #ff2e2e"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)"; }}
        aria-label="Ouvrir le chat"
      >
        <IconChat />
        CHAT
        {unread > 0 && !open && (
          <span
            className="font-archivo-black text-white text-xs flex items-center justify-center"
            style={{
              backgroundColor: "#ff2e2e",
              border:          "2px solid #ffd400",
              borderRadius:    "999px",
              minWidth:        "20px",
              height:          "20px",
              padding:         "0 5px",
              fontSize:        "11px",
              lineHeight:      1,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  );
}

function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
