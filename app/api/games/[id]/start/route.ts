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

const blueprints = [
  'https://www.the-blueprints.com/blueprints/cars/audi/83215/view/audi_a1_sportback_2018/',
  'https://www.the-blueprints.com/blueprints/cars/bmwcars/27529/view/bmw_3-series_e90/',
  'https://www.the-blueprints.com/blueprints/cars/porsche/77238/view/porsche_356c_1964/',
  'https://www.the-blueprints.com/blueprints/cars/dodge/62376/view/dodge_challenger_1970/',
  'https://www.the-blueprints.com/blueprints/cars/renault/59413/view/renault_5_gtl_5-door_1983/',
  'https://www.the-blueprints.com/blueprints/motorcycles/bmwmotor/73239/view/bmw_k75s_1985/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/87718/view/m1_abrams_105mm/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/75189/view/m109_155mm_spg/',
  'https://www.the-blueprints.com/blueprints/modernplanes/dassault/73549/view/dassault_mirage_2000b/',
  'https://www.the-blueprints.com/blueprints/modernplanes/lockheed/27152/view/lockheed_c-5_galaxy/',
  'https://drawingdatabase.com/lockheed-martin-f-22-raptor/',
  'https://drawingdatabase.com/honda-gold-wing/',
  'https://drawingdatabase.com/volvo-vnl-tractor-truck-2018/',
  'https://drawingdatabase.com/dodge-challenger-1970/',
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
    brief = {
      brief_objet:   random(objets),
      brief_style:   random(styles),
      blueprint_url: random(blueprints),
    }
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
