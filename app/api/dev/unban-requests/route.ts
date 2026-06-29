import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Liste / supprime les demandes de déban. Mêmes garde-fous que le dashboard :
// compte admin + mot de passe dev.

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

// ─── POST — liste toutes les demandes (avec infos joueur) ─────────────────────
export async function POST(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { password } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const db = admin();
  const { data, error } = await db
    .from("unban_requests")
    .select("id, user_id, message, created_at, users!inner(pseudo, avatar_color, banned, ban_reason)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []).map((r) => {
    const u = (r as unknown as { users: { pseudo: string; avatar_color: string | null; banned: boolean; ban_reason: string | null } }).users;
    return {
      id:         (r as { id: string }).id,
      userId:     (r as { user_id: string }).user_id,
      message:    (r as { message: string }).message,
      createdAt:  (r as { created_at: string }).created_at,
      pseudo:     u?.pseudo ?? "—",
      avatarColor: u?.avatar_color ?? null,
      banned:     !!u?.banned,
      banReason:  u?.ban_reason ?? null,
    };
  });

  return NextResponse.json({ requests });
}

// ─── DELETE — supprime une demande ────────────────────────────────────────────
export async function DELETE(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { password, id } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const { error } = await admin().from("unban_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
