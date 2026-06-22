"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Card from "@/components/Card";

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>;
type AlertMsg = { text: string; ok: boolean } | null;

// ─── Field component ──────────────────────────────────────────────────────────

function EditField({
  label, id, value, onChange, maxLength, placeholder,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; maxLength?: number; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-archivo-black text-[#1a1a1a] uppercase text-xs tracking-widest">
        {label}
      </label>
      <input
        id={id} value={value} maxLength={maxLength} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none transition-shadow duration-100"
        style={{ fontWeight: 700, fontSize: "15px", padding: "13px 16px", border: "4px solid #1a1a1a", borderRadius: "11px", boxShadow: "3px 3px 0 #1a1a1a" }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; e.currentTarget.style.borderColor = "#ff2e2e"; }}
        onBlur={(e)  => { e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
      />
    </div>
  );
}

function EditTextarea({
  label, id, value, onChange, maxLength,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void; maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="font-archivo-black text-[#1a1a1a] uppercase text-xs tracking-widest">
          {label}
        </label>
        <span className="font-archivo text-[#1a1a1a]/40 text-xs" style={{ fontWeight: 600 }}>
          {value.length}/{maxLength ?? 200}
        </span>
      </div>
      <textarea
        id={id} value={value} maxLength={maxLength ?? 200} rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-archivo bg-white text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 outline-none transition-shadow duration-100 resize-none"
        style={{ fontWeight: 700, fontSize: "15px", padding: "13px 16px", border: "4px solid #1a1a1a", borderRadius: "11px", boxShadow: "3px 3px 0 #1a1a1a" }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "3px 3px 0 #ff2e2e"; e.currentTarget.style.borderColor = "#ff2e2e"; }}
        onBlur={(e)  => { e.currentTarget.style.boxShadow = "3px 3px 0 #1a1a1a"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
      />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(26,26,26,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-5 p-6"
        style={{ backgroundColor: "#fff", border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #1a1a1a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "28px" }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [alert,    setAlert]    = useState<AlertMsg>(null);

  // Champs édition
  const [editPseudo,     setEditPseudo]     = useState('');
  const [editDesc,       setEditDesc]       = useState('');
  const [editCountry,    setEditCountry]    = useState('');
  const [editInstagram,  setEditInstagram]  = useState('');
  const [editTiktok,     setEditTiktok]     = useState('');
  const [editYoutube,    setEditYoutube]    = useState('');

  // Modals
  const [emailModal,    setEmailModal]    = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newEmail,      setNewEmail]      = useState('');
  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPwd,    setConfirmPwd]    = useState('');
  const [modalAlert,    setModalAlert]    = useState<AlertMsg>(null);
  const [modalLoading,  setModalLoading]  = useState(false);

  useEffect(() => {
    // Lecture immédiate depuis les cookies (pas de réseau)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return; }
      const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single();
      if (data) setProfile(data);
      setLoading(false); // toujours appelé, même si data est null
    });

    // Capte les changements ultérieurs (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) { setProfile(null); setLoading(false); return; }
        const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single();
        if (data) setProfile(data);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setEditPseudo(profile?.pseudo    || '');
    setEditDesc(profile?.description || '');
    setEditCountry(profile?.country  || '');
    setEditInstagram(profile?.instagram || '');
    setEditTiktok(profile?.tiktok    || '');
    setEditYoutube(profile?.youtube  || '');
    setAlert(null);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setAlert(null); };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setAlert(null);
    const { error } = await supabase
      .from('users')
      .update({
        pseudo:      editPseudo.trim(),
        description: editDesc.trim(),
        country:     editCountry.trim().toUpperCase().slice(0, 2),
        instagram:   editInstagram.trim(),
        tiktok:      editTiktok.trim(),
        youtube:     editYoutube.trim(),
      })
      .eq('id', profile.id);

    if (error) {
      const msg = error.message.includes('unique') || error.code === '23505'
        ? 'Ce pseudo est déjà utilisé.'
        : error.message;
      setAlert({ text: msg, ok: false });
      setSaving(false);
      return;
    }

    // Recharge les données
    const { data } = await supabase.from('users').select('*').eq('id', profile.id).single();
    if (data) setProfile(data);
    setAlert({ text: 'Profil mis à jour !', ok: true });
    setEditing(false);
    setSaving(false);
  };

  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) return;
    setModalLoading(true);
    setModalAlert(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setModalLoading(false);
    if (error) { setModalAlert({ text: error.message, ok: false }); return; }
    setModalAlert({ text: 'Vérifie ton nouvel email pour confirmer.', ok: true });
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPwd) {
      setModalAlert({ text: 'Les mots de passe ne correspondent pas.', ok: false }); return;
    }
    if (newPassword.length < 6) {
      setModalAlert({ text: 'Minimum 6 caractères.', ok: false }); return;
    }
    setModalLoading(true);
    setModalAlert(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setModalLoading(false);
    if (error) { setModalAlert({ text: error.message, ok: false }); return; }
    setModalAlert({ text: 'Mot de passe mis à jour !', ok: true });
    setNewPassword(''); setConfirmPwd('');
  };

  const closeEmailModal = () => { setEmailModal(false); setNewEmail(''); setModalAlert(null); };
  const closePwdModal   = () => { setPasswordModal(false); setNewPassword(''); setConfirmPwd(''); setModalAlert(null); };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="font-bangers text-[#1a1a1a] tracking-widest" style={{ fontSize: "32px" }}>CHARGEMENT...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">Profil introuvable.</p>
      </main>
    );
  }

  const pseudo        = profile.pseudo        || '';
  const initials      = pseudo.slice(0, 2).toUpperCase() || '??';
  const avatarColor   = profile.avatar_color  || '#8a3ffc';
  const description   = profile.description   || '';
  const country       = profile.country       || '';
  const elo           = profile.elo           ?? 1000;
  const rang          = profile.rang          ?? null;
  const partiesJouees = profile.parties_jouees     ?? 0;
  const meilleurClass = profile.meilleur_classement ?? null;
  const bestRenderUrl = profile.best_render_url     || null;
  const instagram     = profile.instagram     || '';
  const tiktok        = profile.tiktok        || '';
  const youtube       = profile.youtube       || '';

  const STATS = [
    { label: "PARTIES JOUEES",      value: String(partiesJouees),                       prefix: ""  },
    { label: "MEILLEUR CLASSEMENT", value: meilleurClass ? String(meilleurClass) : '-', prefix: meilleurClass ? "#" : "" },
    { label: "ELO ACTUEL",          value: String(elo),                                 prefix: ""  },
  ];

  const hasSocials = instagram || tiktok || youtube;

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* ── Alert globale ── */}
        {alert && (
          <div
            className="rounded-[12px] border-[4px] px-5 py-4 font-archivo-black text-sm uppercase tracking-wide"
            style={{ borderColor: alert.ok ? '#0aa36b' : '#ff2e2e', color: alert.ok ? '#0aa36b' : '#ff2e2e', backgroundColor: '#fff', boxShadow: `4px 4px 0 ${alert.ok ? '#0aa36b' : '#ff2e2e'}` }}
          >
            {alert.text}
          </div>
        )}

        {/* ── Header profil ── */}
        <Card className="!p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="rounded-full border-[6px] border-[#1a1a1a] flex items-center justify-center font-archivo-black text-white shrink-0"
              style={{ width: 120, height: 120, fontSize: "28px", backgroundColor: avatarColor, boxShadow: "4px 4px 0 #1a1a1a" }}
            >
              {initials}
            </div>

            <div className="flex flex-col gap-2 items-center sm:items-start text-center sm:text-left w-full">
              {editing ? (
                <div className="flex flex-col gap-4 w-full">
                  <EditField label="PSEUDO" id="pseudo" value={editPseudo} onChange={setEditPseudo} maxLength={30} placeholder="Ton pseudo..." />
                  <EditTextarea label="DESCRIPTION" id="desc" value={editDesc} onChange={setEditDesc} maxLength={200} />
                  <EditField label="PAYS (code ISO, ex: FR)" id="country" value={editCountry} onChange={setEditCountry} maxLength={2} placeholder="FR" />
                </div>
              ) : (
                <>
                  <h1 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "40px" }}>
                    {pseudo || "BRAWLER"}
                  </h1>
                  {country && (
                    <span className="font-archivo-black text-xs text-[#1a1a1a] bg-[#ffd400] border-[3px] border-[#1a1a1a] px-3 py-1 uppercase tracking-widest self-center sm:self-start" style={{ borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a" }}>
                      {country}
                    </span>
                  )}
                  {description ? (
                    <p className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed" style={{ fontWeight: 700 }}>{description}</p>
                  ) : (
                    <p className="font-archivo text-[#1a1a1a]/40 text-sm italic" style={{ fontWeight: 600 }}>Aucune description pour l&apos;instant.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* ── ELO badge ── */}
        <div className="flex flex-col items-center py-8 px-6 rounded-[16px] border-[5px] border-[#1a1a1a]" style={{ backgroundColor: "#1a1a1a", boxShadow: "6px 6px 0 #ffd400" }}>
          <span className="font-bangers tracking-widest text-[#ffd400] leading-none tabular-nums" style={{ fontSize: "52px" }}>{elo}</span>
          <span className="font-archivo-black text-xs uppercase tracking-widest mt-1" style={{ color: "#ffd400", opacity: 0.6 }}>ELO</span>
          {rang && <span className="font-archivo-black text-sm uppercase tracking-widest mt-2" style={{ color: "#ffd400" }}>#{rang} MONDIAL</span>}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <Card key={s.label} className="!p-4 flex flex-col items-center text-center gap-1">
              <span className="font-bangers text-[#ff2e2e] leading-none tabular-nums" style={{ fontSize: "36px" }}>{s.prefix}{s.value}</span>
              <span className="font-archivo-black text-[#1a1a1a]/55 uppercase leading-tight" style={{ fontSize: "10px", letterSpacing: "0.08em" }}>{s.label}</span>
            </Card>
          ))}
        </div>

        {/* ── Meilleur rendu ── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>MON MEILLEUR RENDU</SectionTitle>
          {bestRenderUrl ? (
            <div className="w-full h-64 border-[5px] border-[#1a1a1a] rounded-[16px] overflow-hidden" style={{ boxShadow: "6px 6px 0 #1a1a1a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bestRenderUrl} alt="Meilleur rendu" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-64 border-[5px] border-[#1a1a1a] rounded-[16px] relative overflow-hidden" style={{ boxShadow: "6px 6px 0 #1a1a1a", background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1a0a2e 100%)" }}>
              <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,212,0,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,212,0,.8) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-archivo-black text-white/30 uppercase text-center px-6 leading-relaxed" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>AUCUN RENDU SOUMIS<br />POUR L&apos;INSTANT</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Réseaux ── */}
        {(editing || hasSocials) && (
          <div className="flex flex-col gap-4">
            <SectionTitle>RESEAUX</SectionTitle>
            {editing ? (
              <div className="flex flex-col gap-4">
                <EditField label="INSTAGRAM (sans @)" id="instagram" value={editInstagram} onChange={setEditInstagram} placeholder="tonpseudo" />
                <EditField label="TIKTOK (sans @)"    id="tiktok"    value={editTiktok}    onChange={setEditTiktok}    placeholder="tonpseudo" />
                <EditField label="YOUTUBE"            id="youtube"   value={editYoutube}   onChange={setEditYoutube}   placeholder="nom de chaîne" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {instagram && <SocialBtn icon={<IconInstagram />} label={`@${instagram}`} />}
                {tiktok    && <SocialBtn icon={<IconTikTok />}    label={`@${tiktok}`} />}
                {youtube   && <SocialBtn icon={<IconYouTube />}   label={youtube} />}
              </div>
            )}
          </div>
        )}

        {/* ── Paramètres ── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>PARAMETRES</SectionTitle>
          <Card className="!p-5 flex flex-col gap-3">
            {editing ? (
              <>
                <Button variant="primary" onClick={handleSave} disabled={saving} className="!block !w-full !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#8b0000] hover:!shadow-[0_9px_0_#8b0000] hover:!-translate-y-[3px] disabled:!opacity-60 disabled:!translate-y-0 disabled:!shadow-[0_6px_0_#8b0000] disabled:!cursor-not-allowed">
                  {saving ? "SAUVEGARDE..." : "SAUVEGARDER"}
                </Button>
                <Button variant="secondary" onClick={cancelEdit} disabled={saving} className="!block !w-full !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a] hover:!shadow-[0_9px_0_#1a1a1a] hover:!-translate-y-[3px]">
                  ANNULER
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={startEdit} className="!block !w-full !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a] hover:!shadow-[0_9px_0_#1a1a1a] hover:!-translate-y-[3px]">
                MODIFIER MON PROFIL
              </Button>
            )}

            <Button variant="secondary" onClick={() => { setModalAlert(null); setEmailModal(true); }} className="!block !w-full !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a] hover:!shadow-[0_9px_0_#1a1a1a] hover:!-translate-y-[3px]">
              CHANGER L&apos;EMAIL
            </Button>
            <Button variant="secondary" onClick={() => { setModalAlert(null); setPasswordModal(true); }} className="!block !w-full !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a] hover:!shadow-[0_9px_0_#1a1a1a] hover:!-translate-y-[3px]">
              CHANGER LE MOT DE PASSE
            </Button>
            <Button variant="secondary" onClick={handleSignOut} className="!block !w-full !text-base !py-3 !rounded-[12px] !bg-[#ff2e2e] !text-white !shadow-[0_6px_0_#8b0000] hover:!shadow-[0_9px_0_#8b0000] hover:!-translate-y-[3px]">
              SE DECONNECTER
            </Button>
          </Card>
        </div>

      </div>

      {/* ── Modal email ── */}
      {emailModal && (
        <Modal title="CHANGER L'EMAIL" onClose={closeEmailModal}>
          {modalAlert && (
            <div className="rounded-[10px] border-[3px] px-4 py-3 font-archivo-black text-xs uppercase tracking-wide" style={{ borderColor: modalAlert.ok ? '#0aa36b' : '#ff2e2e', color: modalAlert.ok ? '#0aa36b' : '#ff2e2e', backgroundColor: '#fff', boxShadow: `3px 3px 0 ${modalAlert.ok ? '#0aa36b' : '#ff2e2e'}` }}>
              {modalAlert.text}
            </div>
          )}
          <EditField label="NOUVEL EMAIL" id="new-email" value={newEmail} onChange={setNewEmail} placeholder="email@exemple.com" />
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleEmailUpdate} disabled={modalLoading || !newEmail.trim()} className="!flex-1 !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#8b0000] disabled:!opacity-60 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_6px_0_#8b0000]">
              {modalLoading ? "..." : "CONFIRMER"}
            </Button>
            <Button variant="secondary" onClick={closeEmailModal} className="!flex-1 !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a]">
              ANNULER
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modal mot de passe ── */}
      {passwordModal && (
        <Modal title="CHANGER LE MOT DE PASSE" onClose={closePwdModal}>
          {modalAlert && (
            <div className="rounded-[10px] border-[3px] px-4 py-3 font-archivo-black text-xs uppercase tracking-wide" style={{ borderColor: modalAlert.ok ? '#0aa36b' : '#ff2e2e', color: modalAlert.ok ? '#0aa36b' : '#ff2e2e', backgroundColor: '#fff', boxShadow: `3px 3px 0 ${modalAlert.ok ? '#0aa36b' : '#ff2e2e'}` }}>
              {modalAlert.text}
            </div>
          )}
          <EditField label="NOUVEAU MOT DE PASSE"    id="new-pwd"     value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
          <EditField label="CONFIRMER MOT DE PASSE"  id="confirm-pwd" value={confirmPwd}  onChange={setConfirmPwd}  placeholder="••••••••" />
          <div className="flex gap-3">
            <Button variant="primary" onClick={handlePasswordUpdate} disabled={modalLoading || !newPassword} className="!flex-1 !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#8b0000] disabled:!opacity-60 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_6px_0_#8b0000]">
              {modalLoading ? "..." : "CONFIRMER"}
            </Button>
            <Button variant="secondary" onClick={closePwdModal} className="!flex-1 !text-base !py-3 !rounded-[12px] !shadow-[0_6px_0_#1a1a1a]">
              ANNULER
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a]" style={{ borderLeft: "5px solid #ff2e2e", paddingLeft: "14px" }}>
      {children}
    </h2>
  );
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 font-archivo-black text-white text-sm uppercase tracking-wide px-5 py-2.5 border-[4px] border-[#1a1a1a] transition-all duration-100 hover:-translate-y-[2px]"
      style={{ backgroundColor: "#2e6bff", borderRadius: "12px", boxShadow: "4px 4px 0 #1a1a1a" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 7px 0 #1a1a1a"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 4px 0 #1a1a1a"; }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
