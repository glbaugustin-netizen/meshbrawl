"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";

const NAV_LINKS = [
  { label: "ACCUEIL",       href: "/" },
  { label: "LE MATCH",      href: "/match" },
  { label: "COMMENT JOUER", href: "/comment-jouer" },
  { label: "CLASSEMENT",    href: "/classement" },
];

const DROPDOWN_ITEMS = [
  { label: "MON PROFIL",     href: "/profil",     danger: false },
  { label: "CLASSEMENT",     href: "/classement", danger: false },
  { label: "SE DECONNECTER", href: null,           danger: true  },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname.startsWith('/jeu')) return null;
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [user,        setUser]        = useState<User | null>(null);
  const [pseudo,      setPseudo]      = useState('');
  const [avatarColor, setAvatarColor] = useState('#8a3ffc');

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      const { data: profile } = await supabase
        .from('users')
        .select('pseudo, avatar_color')
        .eq('id', userId)
        .single();
      if (profile) {
        setPseudo(profile.pseudo || '');
        setAvatarColor(profile.avatar_color || '#8a3ffc');
      }
    }

    // Lit la session depuis les cookies immédiatement (pas de réseau)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    // Capte les changements ultérieurs (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setPseudo('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="font-bangers tracking-widest shrink-0 leading-none"
          style={{ fontSize: "28px", color: "#ffd400", WebkitTextStroke: "2px #1a1a1a", textShadow: "3px 3px 0 #ff2e2e" }}>
          MESHBRAWL
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}
                className="font-archivo-black text-[#ffd400] text-sm uppercase tracking-wide transition-colors duration-100 hover:text-[#ff2e2e] hover:underline underline-offset-4 decoration-2">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <AvatarMenu user={user} pseudo={pseudo} avatarColor={avatarColor} />
          ) : (
            <Button variant="secondary" onClick={() => router.push('/auth')} className="!px-4 !py-1 !text-base !rounded-[10px] !border-[3px] !shadow-[0_5px_0_#000] hover:!shadow-[0_8px_0_#000]">
              CONNEXION
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-10 h-10 shrink-0"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          <span className="block w-7 h-[3px] bg-[#ffd400] transition-all duration-200 origin-center"
            style={menuOpen ? { transform: "translateY(8px) rotate(45deg)" } : {}} />
          <span className="block w-7 h-[3px] bg-[#ffd400] transition-all duration-200"
            style={menuOpen ? { opacity: 0 } : {}} />
          <span className="block w-7 h-[3px] bg-[#ffd400] transition-all duration-200 origin-center"
            style={menuOpen ? { transform: "translateY(-8px) rotate(-45deg)" } : {}} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t-[3px] border-[#ffd400]" style={{ backgroundColor: "#1a1a1a" }}>
          <ul className="flex flex-col px-4 py-4 gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}
                  className="block font-archivo-black text-[#ffd400] text-base uppercase tracking-wide py-2 border-b-2 border-[#ffd400]/20 hover:text-[#ff2e2e] transition-colors duration-100"
                  onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-3 pt-2">
              {user ? (
                <AvatarMenu user={user} pseudo={pseudo} avatarColor={avatarColor} />
              ) : (
                <Button variant="secondary" onClick={() => { setMenuOpen(false); router.push('/auth'); }} className="!px-4 !py-1 !text-base !rounded-[10px] !border-[3px] !shadow-[0_5px_0_#000] hover:!shadow-[0_8px_0_#000]">
                  CONNEXION
                </Button>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

// ─── Avatar + dropdown ────────────────────────────────────────────────────────

function AvatarMenu({ user, pseudo, avatarColor }: { user: User; pseudo: string; avatarColor: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref    = useRef<HTMLDivElement>(null);

  const initials = pseudo.slice(0, 2).toUpperCase() || '?';

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleSignOut = () => {
    const supabase = createClient();
    // signOut en arrière-plan — ne pas awaiter pour ne pas bloquer la navigation
    supabase.auth.signOut().catch(console.error);
    setOpen(false);
    router.push('/');
  };

  // user prop kept for future use (e.g. displaying email in dropdown)
  void user;

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        className="w-9 h-9 rounded-full flex items-center justify-center font-bangers text-sm transition-transform duration-100 hover:scale-110 focus-visible:outline-none"
        style={{
          backgroundColor: avatarColor,
          border:    `3px solid ${avatarColor}`,
          boxShadow: open ? "2px 2px 0 #ff2e2e" : "2px 2px 0 #1a1a1a",
          color:     "#1a1a1a",
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] min-w-[200px] overflow-hidden"
          style={{ backgroundColor: "#fff", border: "4px solid #1a1a1a", borderRadius: "12px", boxShadow: "6px 6px 0 #1a1a1a", zIndex: 100 }}
        >
          {DROPDOWN_ITEMS.map((item, idx) =>
            item.href ? (
              <button
                key={item.label}
                type="button"
                onClick={() => { setOpen(false); router.push(item.href!); }}
                className="block w-full text-left font-archivo-black uppercase tracking-wide text-sm px-5 py-3 transition-colors duration-100 hover:bg-[#ffd400]"
                style={{ color: "#1a1a1a", borderTop: idx > 0 ? "2px solid #1a1a1a" : undefined }}
              >
                {item.label}
              </button>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={handleSignOut}
                className="block w-full text-left font-archivo-black uppercase tracking-wide text-sm px-5 py-3 transition-colors duration-100 hover:bg-[#ffd400]"
                style={{ color: "#ff2e2e", borderTop: "2px solid #1a1a1a" }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
