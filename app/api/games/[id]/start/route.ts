import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ─── Brief generation data ────────────────────────────────────────────────────

const objets = [
  'Fusée', 'Dragon', 'Robot', 'Épée', 'Château fort',
  'Moto', 'Requin', 'Couronne', 'Guitare', 'Chaise',
  'Lampe', 'Tank', 'Sous-marin', 'Lion', 'Phare',
  'Sceptre', 'Cristal', 'Volcan',
]

const styles = [
  'Futuriste', 'Post-apocalyptique', 'Médiéval',
  'Fantasy', 'Cyberpunk', 'Steampunk', 'Horreur',
  'Sous-marin', 'Spatial', 'Cartoon', 'Réaliste',
  'Low-poly', 'Glacial', 'Doré / Royal', 'Rouillé / Usé',
]

const contraintes = [
  'Low-poly uniquement', 'Symétrique', 'Sans textures',
  'Doit flotter dans les airs', 'Doit être cassé / détruit',
  'Doit être géant', 'Doit être miniature',
]

const actions = [
  'marcher', 'courir', 'sauter', 'attaquer',
  'danser', 'voler', 'nager', 'frapper', 'esquiver',
]

const stylesAnim = [
  'Cinématique', 'Cartoon', 'Réaliste',
  'Slow motion', 'Loop parfaite', 'Manga / anime', 'Horror / creepy',
]

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try {
            c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('mode, duration_seconds, status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
  if (game.status === 'in_progress') return NextResponse.json({ success: true })

  // Génère le brief selon le mode
  let brief: Record<string, string> = {}

  if (game.mode === 'imaginaire') {
    brief = {
      brief_objet:      random(objets),
      brief_style:      random(styles),
      brief_contrainte: Math.random() > 0.5 ? random(contraintes) : '',
    }
  } else if (game.mode === 'texturing') {
    brief = { brief_style: random(styles) }
  } else if (game.mode === 'animation') {
    const roll = Math.random()
    if (roll < 0.33) {
      brief = { brief_action: random(actions) }
    } else if (roll < 0.66) {
      brief = { brief_style: random(stylesAnim) }
    } else {
      brief = { brief_action: 'LIBRE' }
    }
  } else if (game.mode === 'modelisation') {
    brief = { brief_objet: random(objets), brief_style: random(styles) }
  }

  const now = new Date()
  const { error } = await supabase
    .from('games')
    .update({
      status:     'in_progress',
      started_at: now.toISOString(),
      ends_at:    new Date(now.getTime() + game.duration_seconds * 1000).toISOString(),
      ...brief,
    })
    .eq('id', gameId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
