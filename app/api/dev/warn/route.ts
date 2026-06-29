import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Incrémente / décrémente le nombre d'avertissements d'un joueur.
// Garde-fous : compte admin + mot de passe dev.

export const dynamic = "force-dynamic";

const ADMIN_ID     = "14f2b93c-1b7d-4806-822e-d687ea944bef";
const DEV_PASSWORD = process.env.DEV_PASSWORD ?? "meshbrawl-dev-2026";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { password, userId, delta } = await request.json().catch(() => ({}));
  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  if (!userId || (delta !== 1 && delta !== -1)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const db = admin();

  const { data: row } = await db
    .from("users")
    .select("warns")
    .eq("id", userId)
    .single();

  const current = row?.warns ?? 0;
  const next    = Math.max(0, current + delta); // jamais négatif

  const { error } = await db
    .from("users")
    .update({ warns: next })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ warns: next });
}
