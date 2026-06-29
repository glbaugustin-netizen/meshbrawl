import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Le tribunal n'est accessible que si le flag est activé côté dev.
async function tribunalEnabled(): Promise<boolean> {
  const { data } = await admin()
    .from("app_settings")
    .select("value")
    .eq("key", "tribunal_enabled")
    .maybeSingle();
  return !!data?.value;
}

// ─── GET — liste les cas avec décompte des votes + mon vote ───────────────────
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  if (!(await tribunalEnabled())) {
    return NextResponse.json({ error: "Tribunal fermé", disabled: true }, { status: 403 });
  }

  const db = admin();

  const { data: cases, error } = await db
    .from("tribunal_cases")
    .select("id, user_id, ban_reason, argument, created_at, users!inner(pseudo, avatar_color)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const caseIds = (cases ?? []).map((c) => (c as { id: string }).id);

  let votes: { case_id: string; voter_id: string; vote: string }[] = [];
  if (caseIds.length) {
    const { data } = await db
      .from("tribunal_votes")
      .select("case_id, voter_id, vote")
      .in("case_id", caseIds);
    votes = (data ?? []) as typeof votes;
  }

  const result = (cases ?? []).map((c) => {
    const cc = c as unknown as {
      id: string; user_id: string; ban_reason: string | null; argument: string; created_at: string;
      users: { pseudo: string; avatar_color: string | null };
    };
    const cv       = votes.filter((v) => v.case_id === cc.id);
    const banCount   = cv.filter((v) => v.vote === "ban").length;
    const debanCount = cv.filter((v) => v.vote === "deban").length;
    const myVote   = cv.find((v) => v.voter_id === user.id)?.vote ?? null;
    return {
      id:          cc.id,
      userId:      cc.user_id,
      pseudo:      cc.users?.pseudo ?? "—",
      avatarColor: cc.users?.avatar_color ?? null,
      banReason:   cc.ban_reason,
      argument:    cc.argument,
      createdAt:   cc.created_at,
      banCount,
      debanCount,
      myVote,
      isMine:      cc.user_id === user.id,
    };
  });

  return NextResponse.json({ cases: result });
}

// ─── POST — vote une seule fois (ban | deban) ─────────────────────────────────
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  if (!(await tribunalEnabled())) {
    return NextResponse.json({ error: "Tribunal fermé" }, { status: 403 });
  }

  const { caseId, vote } = await request.json().catch(() => ({}));
  if (!caseId || (vote !== "ban" && vote !== "deban")) {
    return NextResponse.json({ error: "Vote invalide" }, { status: 400 });
  }

  const db = admin();

  const { data: c } = await db
    .from("tribunal_cases")
    .select("user_id")
    .eq("id", caseId)
    .single();
  if (!c) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });
  if ((c as { user_id: string }).user_id === user.id) {
    return NextResponse.json({ error: "Tu ne peux pas voter pour ton propre cas" }, { status: 400 });
  }

  // Vote unique : si déjà voté, on refuse (insertion bloquée par la contrainte UNIQUE)
  const { error } = await db
    .from("tribunal_votes")
    .insert({ case_id: caseId, voter_id: user.id, vote });

  if (error) {
    // 23505 = violation d'unicité → l'utilisateur a déjà voté
    if (error.code === "23505") {
      return NextResponse.json({ error: "Tu as déjà voté pour ce cas" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
