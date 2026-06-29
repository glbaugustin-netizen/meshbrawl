import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Réglages globaux du site (feature flags). Lecture/écriture réservées au
// compte admin + mot de passe dev. La lecture publique du flag se fait
// directement côté serveur (page d'accueil) ou via le service role (API).

export const dynamic = "force-dynamic";

const ADMIN_ID     = "14f2b93c-1b7d-4806-822e-d687ea944bef";
const DEV_PASSWORD = process.env.DEV_PASSWORD ?? "meshbrawl-dev-2026";
const TRIBUNAL_KEY = "tribunal_enabled";

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

async function readTribunal(): Promise<boolean> {
  const { data } = await admin()
    .from("app_settings")
    .select("value")
    .eq("key", TRIBUNAL_KEY)
    .maybeSingle();
  return !!data?.value;
}

// ─── POST — lit les réglages (admin) ──────────────────────────────────────────
export async function POST(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { password } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  return NextResponse.json({ tribunalEnabled: await readTribunal() });
}

// ─── PUT — modifie le flag tribunal (admin) ───────────────────────────────────
export async function PUT(request: Request) {
  const user = await authGuard();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { password, tribunalEnabled } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const { error } = await admin()
    .from("app_settings")
    .upsert({ key: TRIBUNAL_KEY, value: !!tribunalEnabled }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tribunalEnabled: !!tribunalEnabled });
}
