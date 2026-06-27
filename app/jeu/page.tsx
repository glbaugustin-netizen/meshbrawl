"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import GameChat from "@/components/GameChat";

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Game = Record<string, any>;

interface GamePlayer {
  id:      string;
  user_id: string;
  status:  string;
  users: { pseudo: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// Parse une timestamp en ms epoch. Le serveur écrit toujours ends_at en UTC
// (.toISOString()). Si la chaîne lue depuis la DB n'a PAS d'info de fuseau
// (colonne `timestamp` sans tz), new Date() la lirait en heure LOCALE → décalage
// de plusieurs heures selon le PC. On force donc l'interprétation UTC.
function parseUtcMs(ts: string | null): number {
  if (!ts) return 0;
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(ts);
  return new Date(hasTz ? ts : ts + 'Z').getTime();
}

const MAX_GLB_BYTES = 20 * 1024 * 1024; // 20 MB

// Compresse la géométrie d'un GLB avec meshopt (EXT_meshopt_compression) via
// gltf-transform. Tourne entièrement dans le navigateur : le wasm meshoptimizer
// est inliné (aucun fetch/fs externe), donc fiable dans le bundle. Les libs sont
// importées dynamiquement pour ne pas alourdir le bundle initial.
// NB : meshopt optimise la géométrie (vertices/faces), pas les textures embarquées.
// <model-viewer> décode nativement EXT_meshopt_compression → le rendu reste OK.
async function compressGlb(file: File): Promise<File> {
  const [core, extensions, functions, meshoptimizer] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
    import('meshoptimizer'),
  ]);

  const { MeshoptEncoder, MeshoptDecoder } = meshoptimizer;
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new core.WebIO()
    .registerExtensions(extensions.ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });

  const input  = new Uint8Array(await file.arrayBuffer());
  const doc    = await io.readBinary(input);
  await doc.transform(functions.meshopt({ encoder: MeshoptEncoder }));
  const output = await io.writeBinary(doc);

  return new File([output as BlobPart], file.name, { type: 'model/gltf-binary' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JeuPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">Chargement...</p>
      </main>
    }>
      <JeuPageInner />
    </Suspense>
  );
}

function JeuPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const gameId       = searchParams.get('gameId');
  const supabase     = createClient();

  const [game,       setGame]       = useState<Game | null>(null);
  const [players,    setPlayers]    = useState<GamePlayer[]>([]);
  const [endsAt,     setEndsAt]     = useState<string | null>(null);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [file,       setFile]       = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressInfo, setCompressInfo] = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [gameLoaded,  setGameLoaded]  = useState(false);
  const [quitModal1,  setQuitModal1]  = useState(false);
  const [quitModal2,  setQuitModal2]  = useState(false);
  const [quitting,    setQuitting]    = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPseudo, setCurrentPseudo] = useState('');
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const redirectedRef   = useRef(false);
  const timerWasPositive = useRef(false);

  // Charge la partie
  useEffect(() => {
    if (!gameId) return;

    async function loadGame() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      if (!data) return;
      setGame(data);
      setEndsAt(data.ends_at);
      const secs = Math.max(0, Math.floor((parseUtcMs(data.ends_at) - Date.now()) / 1000));
      setTimeLeft(secs);
      setGameLoaded(true);
    }

    async function loadPlayers() {
      const { data } = await supabase
        .from('game_players')
        .select('id, user_id, status, users(pseudo)')
        .eq('game_id', gameId);
      setPlayers((data as unknown as GamePlayer[]) || []);
    }

    async function loadCurrentUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('pseudo')
          .eq('id', session.user.id)
          .single();
        if (userData) setCurrentPseudo(userData.pseudo);
      }
    }

    loadGame();
    loadPlayers();
    loadCurrentUser();

    const channel = supabase
      .channel(`jeu:${gameId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, () => loadPlayers())
      .subscribe();

    const pollInterval = setInterval(() => {
      loadPlayers();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Chrono
  useEffect(() => {
    if (!endsAt) return;

    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((parseUtcMs(endsAt) - Date.now()) / 1000));
      if (secs > 0) timerWasPositive.current = true;
      setTimeLeft(secs);
      if (secs === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  // Redirige quand le temps est écoulé
  useEffect(() => {
    if (
      timeLeft === 0 &&
      gameId &&
      !redirectedRef.current &&
      gameLoaded &&
      timerWasPositive.current
    ) {
      redirectedRef.current = true;
      router.push(`/vote?gameId=${gameId}`);
    }
  }, [timeLeft, gameId, router, gameLoaded]);

  // Redirige quand tous ont soumis
  useEffect(() => {
    if (players.length === 0 || !gameId || redirectedRef.current) return;
    const allSubmitted = players.every((p) => p.status === 'submitted');
    if (allSubmitted) {
      redirectedRef.current = true;
      router.push(`/vote?gameId=${gameId}`);
    }
  }, [players, gameId, router]);

  // Upload
  const handleUpload = async (f: File) => {
    setUploadError('');
    setCompressInfo('');
    const isVideo = f.type.startsWith('video/');
    const isGLB   = f.name.toLowerCase().endsWith('.glb');
    if (!isVideo && !isGLB) {
      setUploadError('Fichier invalide — .glb ou vidéo uniquement');
      return;
    }

    // Compression auto des GLB > 20 MB (Draco, côté navigateur)
    if (isGLB && f.size > MAX_GLB_BYTES) {
      setCompressing(true);
      try {
        const compressed = await compressGlb(f);
        const beforeMB = (f.size / 1024 / 1024).toFixed(1);
        const afterMB  = (compressed.size / 1024 / 1024).toFixed(1);
        // On garde le plus petit des deux (la compression peut, rarement, ne rien gagner)
        const finalFile = compressed.size < f.size ? compressed : f;
        setFile(finalFile);
        setCompressInfo(
          finalFile === compressed
            ? `Compressé : ${beforeMB} MB → ${afterMB} MB`
            : `Compression sans gain — fichier original conservé (${beforeMB} MB)`
        );
      } catch (e) {
        console.error('Compression GLB échouée:', e);
        setFile(f); // on n'empêche jamais la soumission
        setCompressInfo('Compression impossible — fichier original conservé');
      } finally {
        setCompressing(false);
      }
      return;
    }

    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !gameId || submitted) return;
    setUploading(true);
    setUploadError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }

    const isVideo  = file.type.startsWith('video/');
    const filePath = `${gameId}/${session.user.id}/${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      setUploadError('Erreur upload : ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = await supabase.storage
      .from('submissions')
      .createSignedUrl(filePath, 60 * 60 * 24);

    await supabase
      .from('game_players')
      .update({
        status:          'submitted',
        submission_url:  urlData?.signedUrl ?? '',
        submission_type: isVideo ? 'video' : 'glb',
      })
      .eq('game_id', gameId)
      .eq('user_id', session.user.id);

    setSubmitted(true);
    setUploading(false);
  };

  const handleQuit = async () => {
    setQuitting(true);
    if (!gameId) { setQuitting(false); return; }

    // Tout est fait côté serveur (service role) pour bypasser les RLS :
    // pénalité ELO, suppression du joueur, et suppression de la partie + fichiers
    // si plus aucun joueur ne reste.
    await fetch(`/api/games/${gameId}/quit`, { method: 'POST' }).catch(() => {});

    router.push('/match');
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  };

  const isUrgent       = timeLeft > 0 && timeLeft < 300;
  const submittedCount = players.filter((p) => p.status === 'submitted').length;

  if (!gameId) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <p className="font-archivo-black text-[#1a1a1a] uppercase tracking-widest text-sm">
          Partie introuvable.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* ── Timer ── */}
        <div className="flex justify-center">
          <div
            className="px-10 py-5 flex flex-col items-center gap-1"
            style={{ backgroundColor: "#1a1a1a", border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #1a1a1a" }}
          >
            <span
              className="font-archivo-black text-xs uppercase tracking-widest"
              style={{ color: isUrgent ? "#ff2e2e" : "#ffd400", opacity: 0.6 }}
            >
              TEMPS RESTANT
            </span>
            <span
              className="font-bangers tabular-nums leading-none tracking-widest transition-colors duration-300"
              style={{
                fontSize: "72px",
                color: isUrgent ? "#ff2e2e" : "#ffd400",
                textShadow: isUrgent ? "3px 3px 0 #7a0000" : "3px 3px 0 #7a6300",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8 items-start">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-8">

            {/* Brief bubble */}
            {game && (
              <div>
                <div
                  className="relative bg-white border-[5px] border-[#1a1a1a] rounded-[16px] p-6"
                  style={{ boxShadow: "6px 6px 0 #1a1a1a" }}
                >
                  <p className="font-archivo-black text-[#1a1a1a]/50 text-xs uppercase tracking-widest mb-3">
                    VOTRE BRIEF :
                  </p>

                  <BriefContent game={game} />

                  {/* Bubble tail — outer */}
                  <div style={{ position: "absolute", bottom: -22, left: 40, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderTop: "22px solid #1a1a1a" }} />
                  {/* Bubble tail — inner */}
                  <div style={{ position: "absolute", bottom: -14, left: 40, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "14px solid #ffffff" }} />
                </div>
                <div className="h-6" />

                {/* Asset buttons */}
                <AssetButtons game={game} />
              </div>
            )}

            {/* Drop zone */}
            <div>
              <p className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a] mb-3">
                TON RENDU :
              </p>

              {submitted ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 rounded-[16px] p-10"
                  style={{ backgroundColor: "#f0fff7", border: "3px dashed #0aa36b" }}
                >
                  <IconCheck />
                  <p className="font-bangers uppercase tracking-widest text-[#0aa36b] text-center" style={{ fontSize: "28px" }}>
                    RENDU SOUMIS !
                  </p>
                  <p className="font-archivo-black text-sm uppercase tracking-wide text-[#0aa36b]/70 text-center">
                    En attente des autres brawlers...
                  </p>
                </div>
              ) : compressing ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 rounded-[16px] p-10"
                  style={{ backgroundColor: "#fff7cc", border: "3px dashed #b9a300" }}
                >
                  <span className="inline-block w-10 h-10 border-[4px] border-[#b9a300] border-t-transparent rounded-full animate-spin" />
                  <p className="font-bangers uppercase tracking-widest text-[#b9a300] text-center" style={{ fontSize: "26px" }}>
                    COMPRESSION EN COURS...
                  </p>
                  <p className="font-archivo text-xs text-center text-[#b9a300]" style={{ fontWeight: 600 }}>
                    Fichier &gt; 20 MB — optimisation Draco, ça peut prendre quelques secondes
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center gap-4 rounded-[16px] p-10 transition-all duration-150 cursor-default"
                  style={{
                    backgroundColor: isDragOver ? "#fff0f0" : file ? "#f0fff7" : "#fff7cc",
                    border: `3px dashed ${isDragOver ? "#ff2e2e" : file ? "#0aa36b" : "#b9a300"}`,
                  }}
                >
                  {file ? (
                    <>
                      <IconCheck />
                      <p className="font-archivo-black text-[#0aa36b] text-base uppercase tracking-wide text-center">
                        {file.name}
                      </p>
                      <p className="font-archivo text-xs text-[#0aa36b]/70 text-center" style={{ fontWeight: 600 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB — Fichier prêt
                      </p>
                      {compressInfo && (
                        <p className="font-archivo-black text-[11px] uppercase tracking-wide text-[#2e6bff] text-center">
                          {compressInfo}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => { setFile(null); setCompressInfo(''); }}
                        className="font-archivo-black text-xs uppercase tracking-wide text-[#ff2e2e] underline underline-offset-2 hover:opacity-70 transition-opacity"
                      >
                        Retirer
                      </button>
                    </>
                  ) : (
                    <>
                      <IconUpload dimmed={!isDragOver} />
                      <p className="font-archivo-black uppercase tracking-wide text-center" style={{ color: isDragOver ? "#ff2e2e" : "#b9a300" }}>
                        {isDragOver ? "LACHE TON FICHIER !" : "GLISSE TON FICHIER ICI"}
                      </p>
                      <p className="font-archivo text-xs text-center" style={{ color: "#b9a300", fontWeight: 500 }}>
                        .glb ou vidéo • les .glb &gt; 20 MB sont compressés auto
                      </p>
                      <Button
                        variant="secondary"
                        className="!text-sm !px-5 !py-2 !rounded-[10px] !border-[3px] !shadow-[0_4px_0_#1a1a1a] hover:!shadow-[0_7px_0_#1a1a1a]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        PARCOURIR
                      </Button>
                    </>
                  )}
                </div>
              )}

              {uploadError && (
                <p className="font-archivo-black text-xs uppercase tracking-wide text-[#ff2e2e] mt-2">
                  {uploadError}
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Submit */}
            {!submitted && (
              <div className="flex flex-col items-start gap-3">
                <Button
                  variant="primary"
                  disabled={!file || uploading}
                  onClick={handleSubmit}
                  className="!text-2xl !px-10 !py-3 !rounded-[14px] !shadow-[0_8px_0_#1a1a1a] hover:!shadow-[0_11px_0_#1a1a1a] hover:!-translate-y-[3px] active:!shadow-[0_2px_0_#1a1a1a] disabled:!opacity-40 disabled:!cursor-not-allowed disabled:!translate-y-0 disabled:!shadow-[0_8px_0_#1a1a1a]"
                >
                  {uploading ? (
                    <span className="flex items-center gap-3">
                      <span className="inline-block w-5 h-5 border-[3px] border-[#ffd400] border-t-transparent rounded-full animate-spin" />
                      ENVOI EN COURS...
                    </span>
                  ) : (
                    "SOUMETTRE MON RENDU"
                  )}
                </Button>
                {!file && (
                  <p className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/40">
                    Dépose ton fichier .glb ou vidéo pour activer la soumission
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setQuitModal1(true)}
                className="font-archivo-black text-xs uppercase tracking-widest text-[#1a1a1a]/40 underline underline-offset-4 hover:text-[#ff2e2e] transition-colors duration-100"
              >
                Quitter la partie
              </button>
            </div>
          </div>

          {/* ── Sidebar — Player statuses ── */}
          <aside
            className="bg-white border-[5px] border-[#1a1a1a] rounded-[16px] p-5 lg:sticky lg:top-[84px]"
            style={{ boxShadow: "4px 4px 0 #1a1a1a" }}
          >
            <h2 className="font-archivo-black text-sm uppercase tracking-widest text-[#1a1a1a] mb-4 pb-3 border-b-[3px] border-[#1a1a1a]">
              BRAWLERS — {submittedCount}/{players.length} SOUMIS
            </h2>
            <ul className="flex flex-col gap-3">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="font-archivo-black text-sm text-[#1a1a1a] truncate">
                    {p.users?.pseudo || '???'}
                  </span>
                  <StatusPill status={p.status} />
                </li>
              ))}
              {players.length === 0 && (
                <li className="font-archivo text-xs text-[#1a1a1a]/40 uppercase tracking-widest" style={{ fontWeight: 600 }}>
                  Chargement...
                </li>
              )}
            </ul>

            {gameId && currentUserId && currentPseudo && (
              <GameChat
                gameId={gameId}
                currentUserId={currentUserId || ''}
                currentPseudo={currentPseudo}
              />
            )}
          </aside>
        </div>
      </div>

      {/* Modal 1 — première confirmation */}
      {quitModal1 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(26,26,26,0.7)" }}
        >
          <div
            className="w-full max-w-sm flex flex-col gap-5 p-6"
            style={{ backgroundColor: "#fff", border: "5px solid #1a1a1a", borderRadius: "16px", boxShadow: "6px 6px 0 #1a1a1a" }}
          >
            <h3 className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "28px" }}>
              QUITTER LA PARTIE ?
            </h3>
            <p className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed" style={{ fontWeight: 700 }}>
              Tu es sûr de vouloir abandonner ? Cette action a des conséquences...
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setQuitModal1(false); setQuitModal2(true); }}
                className="flex-1 font-bangers uppercase tracking-widest text-white bg-[#ff2e2e] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
                style={{ borderRadius: "12px", boxShadow: "0 6px 0 #8b0000", fontSize: "20px" }}
              >
                QUITTER
              </button>
              <button
                type="button"
                onClick={() => setQuitModal1(false)}
                className="flex-1 font-bangers uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
                style={{ borderRadius: "12px", boxShadow: "0 6px 0 #1a1a1a", fontSize: "20px" }}
              >
                RESTER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2 — confirmation finale avec pénalité */}
      {quitModal2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(26,26,26,0.7)" }}
        >
          <div
            className="w-full max-w-sm flex flex-col gap-5 p-6"
            style={{ backgroundColor: "#fff", border: "5px solid #ff2e2e", borderRadius: "16px", boxShadow: "6px 6px 0 #ff2e2e" }}
          >
            <h3 className="font-bangers uppercase tracking-widest text-[#ff2e2e] leading-none" style={{ fontSize: "28px" }}>
              DERNIERE CHANCE !
            </h3>
            <div
              className="flex items-center justify-center py-4 border-[4px] border-[#1a1a1a]"
              style={{ borderRadius: "12px", backgroundColor: "#fff7cc", boxShadow: "4px 4px 0 #1a1a1a" }}
            >
              <span className="font-bangers text-[#ff2e2e] tracking-widest" style={{ fontSize: "48px" }}>
                -20 ELO
              </span>
            </div>
            <p className="font-archivo text-[#1a1a1a]/70 text-sm leading-relaxed" style={{ fontWeight: 700 }}>
              Quitter en cours de partie te coûtera <strong>20 ELO</strong>. C&apos;est définitif.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleQuit}
                disabled={quitting}
                className="flex-1 font-bangers uppercase tracking-widest text-white bg-[#ff2e2e] border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderRadius: "12px", boxShadow: "0 6px 0 #8b0000", fontSize: "20px" }}
              >
                {quitting ? "..." : "CONFIRMER"}
              </button>
              <button
                type="button"
                onClick={() => { setQuitModal1(false); setQuitModal2(false); }}
                className="flex-1 font-bangers uppercase tracking-widest text-[#1a1a1a] bg-white border-[4px] border-[#1a1a1a] py-3 transition-all duration-100 hover:-translate-y-[2px]"
                style={{ borderRadius: "12px", boxShadow: "0 6px 0 #1a1a1a", fontSize: "20px" }}
              >
                RESTER
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Brief content ────────────────────────────────────────────────────────────

function BriefContent({ game }: { game: Game }) {
  const mode = game.mode as string;

  if (mode === 'imaginaire') {
    return (
      <>
        <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none mb-2" style={{ fontSize: "42px" }}>
          {(game.brief_objet as string || '???').toUpperCase()}
        </p>
        {game.brief_style && (
          <p className="font-bangers uppercase tracking-widest text-[#1a1a1a]/70 leading-none mb-4" style={{ fontSize: "26px" }}>
            DANS LE STYLE <span className="text-[#2e6bff]">{(game.brief_style as string).toUpperCase()}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <BriefBadge bg="#ffd400" color="#1a1a1a">IMAGINAIRE</BriefBadge>
        </div>
      </>
    );
  }

  if (mode === 'texturing') {
    return (
      <>
        <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none mb-4" style={{ fontSize: "36px" }}>
          TEXTURE CET OBJET
        </p>
        <div className="flex flex-wrap gap-3">
          {game.brief_style && <BriefBadge bg="#2e6bff" color="#fff">{(game.brief_style as string).toUpperCase()}</BriefBadge>}
          <BriefBadge bg="#ffd400" color="#1a1a1a">TEXTURING</BriefBadge>
        </div>
      </>
    );
  }

  if (mode === 'modelisation') {
    return (
      <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "36px" }}>
        REPRODUIS CET OBJET FIDELEMENT
      </p>
    );
  }

  if (mode === 'animation') {
    const action = game.brief_action as string | undefined;
    const style  = game.brief_style  as string | undefined;
    const title  = action === 'LIBRE'
      ? 'ANIME CE PERSONNAGE LIBREMENT'
      : style
      ? `ANIME EN STYLE ${style.toUpperCase()}`
      : action
      ? `ANIME CE PERSONNAGE QUI ${action.toUpperCase()}`
      : 'ANIME CE PERSONNAGE';

    return (
      <>
        <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none mb-4" style={{ fontSize: "36px" }}>
          {title}
        </p>
        <BriefBadge bg="#ffd400" color="#1a1a1a">ANIMATION</BriefBadge>
      </>
    );
  }

  return (
    <p className="font-bangers uppercase tracking-widest text-[#1a1a1a] leading-none" style={{ fontSize: "36px" }}>
      BRIEF EN COURS DE CHARGEMENT...
    </p>
  );
}

// ─── Asset buttons ────────────────────────────────────────────────────────────

function AssetButtons({ game }: { game: Game }) {
  const mode = game.mode as string;

  if (mode === 'modelisation' && game.blueprint_url) {
    return (
      <div className="flex items-center gap-4">
        <span className="font-archivo-black text-sm uppercase tracking-wide text-[#1a1a1a]">REFERENCE :</span>
        <a
          href={game.blueprint_url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="font-archivo-black text-sm uppercase tracking-wide text-[#2e6bff] underline underline-offset-4 decoration-2 hover:text-[#ff2e2e] transition-colors duration-100"
        >
          VOIR LE BLUEPRINT
        </a>
      </div>
    );
  }

  if ((mode === 'texturing' || mode === 'animation') && game.asset_url) {
    const label = mode === 'animation' ? 'TELECHARGER LE RIG' : 'TELECHARGER LE MESH';
    return (
      <div className="flex items-center gap-4">
        <span className="font-archivo-black text-sm uppercase tracking-wide text-[#1a1a1a]">FICHIER DE BASE :</span>
        <a href={game.asset_url as string} download>
          <Button variant="secondary" className="!text-sm !px-5 !py-2 !rounded-[10px] !border-[3px] !shadow-[0_4px_0_#1a1a1a] hover:!shadow-[0_7px_0_#1a1a1a]">
            {label}
          </Button>
        </a>
      </div>
    );
  }

  return null;
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const isSubmitted = status === 'submitted';
  return (
    <span
      className="flex items-center gap-1.5 font-archivo-black text-xs uppercase tracking-wide shrink-0 px-2.5 py-1 border-[2px] border-[#1a1a1a]"
      style={{ borderRadius: "8px", backgroundColor: isSubmitted ? "#f0fff7" : "#fffbe6", color: isSubmitted ? "#0aa36b" : "#b9a300", boxShadow: "2px 2px 0 #1a1a1a" }}
    >
      <span
        className={`w-2 h-2 rounded-full border border-[#1a1a1a] shrink-0 ${isSubmitted ? "" : "animate-blink-dot"}`}
        style={{ backgroundColor: isSubmitted ? "#0aa36b" : "#ff9500" }}
      />
      {isSubmitted ? "SOUMIS" : "EN COURS"}
    </span>
  );
}

// ─── Brief badge ──────────────────────────────────────────────────────────────

function BriefBadge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span
      className="font-archivo-black text-xs uppercase tracking-widest px-3 py-1.5 border-[3px] border-[#1a1a1a]"
      style={{ backgroundColor: bg, color, borderRadius: "8px", boxShadow: "3px 3px 0 #1a1a1a" }}
    >
      {children}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUpload({ dimmed }: { dimmed: boolean }) {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke={dimmed ? "#b9a300" : "#ff2e2e"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="#0aa36b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}
