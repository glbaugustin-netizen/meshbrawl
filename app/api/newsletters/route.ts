import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Empêche Next.js de mettre la réponse GET en cache statique (sinon les autres
// comptes reçoivent une liste figée et ne voient pas les nouvelles newsletters).
export const dynamic = 'force-dynamic'

const ADMIN_ID = '14f2b93c-1b7d-4806-822e-d687ea944bef'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET — liste toutes les newsletters ───────────────────────────────────────

export async function GET() {
  const { data, error } = await admin()
    .from('newsletters')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ newsletters: data ?? [] })
}

// ─── POST — crée une newsletter (admin uniquement) ────────────────────────────

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { title, content } = await request.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 })
  }

  const { data, error } = await admin()
    .from('newsletters')
    .insert({ title: title.trim(), content: content.trim() })
    .select('id, title, content, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ newsletter: data })
}
