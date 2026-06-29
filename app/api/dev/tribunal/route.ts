import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Promeut une demande de déban vers le tribunal public, ou retire un cas.
// Garde-fous : compte admin + mot de passe dev.

export const dynamic = "force-dynamic";

const ADMIN_ID     = "14f2b93c-1b7d-4806-822e-d687ea944bef";
const DEV_PASSWORD = process.env.DEV_PASSWORD ?? "meshbrawl-dev-2026";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authGuard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── POST — promeut une demande au tribunal ───────────────────────────────────
export async function POST(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { password, requestId } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  if (!requestId) return NextResponse.json({ error: "requestId manquant" }, { status: 400 });

  const db = admin();

  // Récupère la demande + la raison du ban du joueur
  const { data: req } = await db
    .from("unban_requests")
    .select("user_id, message, users!inner(ban_reason)")
    .eq("id", requestId)
    .single();

  if (!req) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  const banReason = (req as unknown as { users: { ban_reason: string | null } }).users?.ban_reason ?? null;

  // Crée (ou remplace) le cas au tribunal pour ce joueur
  const { error } = await db
    .from("tribunal_cases")
    .upsert(
      {
        user_id:    (req as { user_id: string }).user_id,
        argument:   (req as { message: string }).message,
        ban_reason: banReason,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // La demande est traitée → on la retire de la liste des demandes
  await db.from("unban_requests").delete().eq("id", requestId);

  return NextResponse.json({ success: true });
}

// ─── DELETE — retire un cas du tribunal (admin, depuis la page publique) ───────
export async function DELETE(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { caseId } = await request.json().catch(() => ({}));
  if (!caseId) return NextResponse.json({ error: "caseId manquant" }, { status: 400 });

  const { error } = await admin().from("tribunal_cases").delete().eq("id", caseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
