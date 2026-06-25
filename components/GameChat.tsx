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
  gameId:    string;
  currentUserId: string;
  currentPseudo: string;
}

export default function GameChat({ gameId, currentUserId, currentPseudo }: Props) {
  const supabase   = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Charge les messages initiaux
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

    // Realtime
    const channel = supabase
      .channel(`chat:${gameId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, supabase]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    await supabase.from('messages').insert({
      game_id:  gameId,
      user_id:  currentUserId,
      pseudo:   currentPseudo,
      content:  text,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="bg-white border-[5px] border-[#1a1a1a] rounded-[16px] flex flex-col"
      style={{ boxShadow: "4px 4px 0 #1a1a1a", height: "320px" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b-[3px] border-[#1a1a1a] flex items-center gap-2"
        style={{ borderRadius: "11px 11px 0 0", backgroundColor: "#1a1a1a" }}
      >
        <span
          className="w-2 h-2 rounded-full animate-blink-dot"
          style={{ backgroundColor: "#0aa36b" }}
        />
        <h3 className="font-archivo-black text-xs uppercase tracking-widest text-[#ffd400]">
          CHAT DE LA PARTIE
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="font-archivo text-xs text-[#1a1a1a]/30 uppercase tracking-widest text-center mt-4" style={{ fontWeight: 600 }}>
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
                  fontWeight: 600,
                  backgroundColor: isMe ? "#ff2e2e" : "#f0f0f0",
                  color: isMe ? "#fff" : "#1a1a1a",
                  borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  border: "2px solid #1a1a1a",
                  boxShadow: "2px 2px 0 #1a1a1a",
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
      <div className="px-3 py-3 border-t-[3px] border-[#1a1a1a] flex gap-2">
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
  );
}
