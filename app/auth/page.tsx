"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Card from "@/components/Card";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#8a3ffc', '#ff2e2e', '#2e6bff', '#0aa36b', '#ff8a00'];

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "login" | "register";
type AlertMsg = { text: string; ok: boolean } | null;

interface LoginFields  { email: string; password: string; }
interface RegisterFields { pseudo: string; email: string; password: string; confirmPassword: string; }

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, id, type = "text", value, onChange, autoComplete,
}: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-archivo-black text-[#1a1a1a] uppercase text-xs tracking-widest">
        {label}
      </label>
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none transition-shadow duration-100"
        style={{ fontWeight: 700, fontSize: "16px", padding: "13px 16px", border: "4px solid #1a1a1a", borderRadius: "11px", boxShadow: "3px 3px 0 #1a1a1a" }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; e.currentTarget.style.borderColor = "#ff2e2e"; }}
        onBlur={(e)  => { e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
      />
    </div>
  );
}

// ─── Toggle tab ───────────────────────────────────────────────────────────────

function ToggleTab({ label, active, position, onClick }: { label: string; active: boolean; position: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 font-archivo-black text-sm uppercase tracking-widest transition-colors duration-100"
      style={{
        borderRadius: position === "left" ? "10px 0 0 0" : "0 10px 0 0",
        backgroundColor: active ? "#ff2e2e" : "#ffffff",
        color: active ? "#ffffff" : "#1a1a1a",
        borderRight: position === "left" ? "3px solid #1a1a1a" : undefined,
      }}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router  = useRouter();
  const [mode, setMode]       = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState<AlertMsg>(null);

  const [login, setLogin]       = useState<LoginFields>({ email: "", password: "" });
  const [register, setRegister] = useState<RegisterFields>({ pseudo: "", email: "", password: "", confirmPassword: "" });

  const clearAlert = () => setAlert(null);

  // ── Connexion ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: login.email.trim(),
      password: login.password,
    });
    setLoading(false);
    if (error) {
      setAlert({ text: error.message, ok: false });
    } else {
      router.push('/');
      router.refresh();
    }
  };

  // ── Inscription ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!register.pseudo.trim()) {
      setAlert({ text: 'Le pseudo est obligatoire.', ok: false });
      return;
    }
    if (register.password !== register.confirmPassword) {
      setAlert({ text: 'Les mots de passe ne correspondent pas.', ok: false });
      return;
    }
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setLoading(true);
    setAlert(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: register.email.trim(),
      password: register.password,
      options: { data: { pseudo: register.pseudo.trim(), avatar_color: avatarColor } },
    });
    setLoading(false);
    if (error) {
      setAlert({ text: error.message, ok: false });
    } else {
      setAlert({ text: 'Vérifie ton email pour confirmer ton compte.', ok: true });
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-0">

        {/* Alert */}
        {alert && (
          <div
            className="mb-4 rounded-[12px] border-[4px] px-5 py-4 font-archivo-black text-sm uppercase tracking-wide"
            style={{
              borderColor:     alert.ok ? '#0aa36b' : '#ff2e2e',
              color:           alert.ok ? '#0aa36b' : '#ff2e2e',
              backgroundColor: '#fff',
              boxShadow:       `4px 4px 0 ${alert.ok ? '#0aa36b' : '#ff2e2e'}`,
            }}
          >
            {alert.text}
          </div>
        )}

        {/* Toggle + Card — un seul bloc avec l'ombre */}
        <div style={{ boxShadow: "6px 6px 0 #1a1a1a", borderRadius: "16px" }}>
          <div className="flex" style={{ border: "5px solid #1a1a1a", borderRadius: "16px 16px 0 0", borderBottom: "none" }}>
            <ToggleTab label="CONNEXION"   active={mode === "login"}    position="left"  onClick={() => { setMode("login");     clearAlert(); }} />
            <ToggleTab label="INSCRIPTION" active={mode === "register"} position="right" onClick={() => { setMode("register"); clearAlert(); }} />
          </div>

          <Card className="!rounded-tl-none !rounded-tr-none !border-t-0 !shadow-none">
            {mode === "login" ? (
              <LoginForm
                fields={login}
                onChange={(k, v) => setLogin((p) => ({ ...p, [k]: v }))}
                onSubmit={handleLogin}
                onSwitch={() => { setMode("register"); clearAlert(); }}
                loading={loading}
              />
            ) : (
              <RegisterForm
                fields={register}
                onChange={(k, v) => setRegister((p) => ({ ...p, [k]: v }))}
                onSubmit={handleRegister}
                onSwitch={() => { setMode("login"); clearAlert(); }}
                loading={loading}
              />
            )}
          </Card>
        </div>

      </div>
    </main>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({
  fields, onChange, onSubmit, onSwitch, loading,
}: {
  fields: LoginFields;
  onChange: (k: keyof LoginFields, v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitch: () => void;
  loading: boolean;
}) {
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "48px" }}>
        CONNEXION
      </h1>

      <div className="flex flex-col gap-4">
        <GoogleButton />
        <OrDivider />
        <Field label="EMAIL"        id="login-email"    type="email"    autoComplete="email"            value={fields.email}    onChange={(v) => onChange("email", v)} />
        <Field label="MOT DE PASSE" id="login-password" type="password" autoComplete="current-password" value={fields.password} onChange={(v) => onChange("password", v)} />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" variant="primary" disabled={loading} className="!w-full !text-2xl !py-3 !rounded-[12px] disabled:!opacity-60 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_8px_0_#1a1a1a]">
          {loading ? "CONNEXION..." : "SE CONNECTER"}
        </Button>
        <p className="text-center font-archivo text-sm text-[#1a1a1a]/70" style={{ fontWeight: 600 }}>
          Pas encore de compte ?{" "}
          <button type="button" onClick={onSwitch} className="font-archivo-black text-[#2e6bff] underline underline-offset-2 hover:text-[#ff2e2e] transition-colors duration-100">
            S&apos;inscrire
          </button>
        </p>
      </div>
    </form>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({
  fields, onChange, onSubmit, onSwitch, loading,
}: {
  fields: RegisterFields;
  onChange: (k: keyof RegisterFields, v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitch: () => void;
  loading: boolean;
}) {
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "48px" }}>
        CREER MON COMPTE
      </h1>

      <div className="flex flex-col gap-4">
        <GoogleButton />
        <OrDivider />
        <Field label="PSEUDO"                    id="register-pseudo"   autoComplete="username"      value={fields.pseudo}          onChange={(v) => onChange("pseudo", v)} />
        <Field label="EMAIL"                     id="register-email"    type="email" autoComplete="email" value={fields.email}       onChange={(v) => onChange("email", v)} />
        <Field label="MOT DE PASSE"              id="register-password" type="password" autoComplete="new-password" value={fields.password} onChange={(v) => onChange("password", v)} />
        <Field label="CONFIRMER LE MOT DE PASSE" id="register-confirm"  type="password" autoComplete="new-password" value={fields.confirmPassword} onChange={(v) => onChange("confirmPassword", v)} />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" variant="primary" disabled={loading} className="!w-full !text-2xl !py-3 !rounded-[12px] disabled:!opacity-60 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_8px_0_#1a1a1a]">
          {loading ? "CREATION..." : "CREER MON COMPTE"}
        </Button>
        <p className="text-center font-archivo text-sm text-[#1a1a1a]/70" style={{ fontWeight: 600 }}>
          Déjà un compte ?{" "}
          <button type="button" onClick={onSwitch} className="font-archivo-black text-[#2e6bff] underline underline-offset-2 hover:text-[#ff2e2e] transition-colors duration-100">
            Se connecter
          </button>
        </p>
      </div>
    </form>
  );
}

// ─── Google button ────────────────────────────────────────────────────────────

function GoogleButton() {
  const handleClick = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 font-archivo-black text-sm uppercase tracking-wide text-[#1a1a1a] bg-white transition-all duration-100 hover:-translate-y-[2px]"
      style={{
        border: "4px solid #1a1a1a",
        borderRadius: "12px",
        padding: "13px 20px",
        boxShadow: "4px 4px 0 #1a1a1a",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "6px 6px 0 #1a1a1a"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 4px 0 #1a1a1a"; }}
    >
      <GoogleLogoSVG />
      CONTINUER AVEC GOOGLE
    </button>
  );
}

// ─── Or divider ───────────────────────────────────────────────────────────────

function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[2px] bg-[#1a1a1a]" />
      <span className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]">
        OU
      </span>
      <div className="flex-1 h-[2px] bg-[#1a1a1a]" />
    </div>
  );
}

// ─── Google logo SVG (4 couleurs officielles) ─────────────────────────────────

function GoogleLogoSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
