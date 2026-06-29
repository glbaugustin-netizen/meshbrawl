import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Le joueur banni soumet (ou met à jour) sa demande de déban.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { message } = await request.json().catch(() => ({}));
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const db = admin();

  // Seul un joueur effectivement banni peut faire une demande.
  const { data: me } = await db
    .from("users")
    .select("banned")
    .eq("id", user.id)
    .single();
  if (!me?.banned) {
    return NextResponse.json({ error: "Compte non banni" }, { status: 400 });
  }

  // Une seule demande par joueur (UNIQUE sur user_id) : on remplace le message.
  const { error } = await db
    .from("unban_requests")
    .upsert(
      { user_id: user.id, message: message.trim(), created_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Indique au front si une demande existe déjà (pour pré-remplir / confirmer).
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ exists: false });

  const { data } = await admin()
    .from("unban_requests")
    .select("message, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    exists:  !!data,
    message: data?.message ?? null,
  });
}
