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

// Blueprints 5 heures — objets compacts (gadgets, armes, électronique)
const blueprints5h = [
  'https://drawingdatabase.com/m1911-pistol/',
  'https://drawingdatabase.com/macbook-pro-15-inch-4th-generation/',
  'https://drawingdatabase.com/nintendo-switch-oled/',
  'https://drawingdatabase.com/samsung-galaxy-a52/',
  'https://drawingdatabase.com/playstation/',
  'https://drawingdatabase.com/wii-u-gamepad/',
  'https://drawingdatabase.com/nintendo-wii/',
  'https://drawingdatabase.com/apple-iphone-11-pro/',
  'https://drawingdatabase.com/nikon-d70/',
  'https://drawingdatabase.com/nintendo-game-boy/',
  'https://drawingdatabase.com/super-nintendo-gamepad/',
  'https://drawingdatabase.com/nokia-6110/',
  'https://drawingdatabase.com/beretta-92fs/',
  'https://drawingdatabase.com/fn-scar-h/',
]

// Blueprints 1 jour — véhicules, avions, bateaux, engins militaires
const blueprints1j = [
  'https://drawingdatabase.com/bmw-x3-m-2020/',
  'https://drawingdatabase.com/subaru-wrx-2023/',
  'https://drawingdatabase.com/freightliner-m2-106/',
  'https://drawingdatabase.com/northrop-yf-23/',
  'https://drawingdatabase.com/nissan-180sx/',
  'https://drawingdatabase.com/volkswagen-sharan-2019/',
  'https://drawingdatabase.com/volkswagen-transporter-t6-2023/',
  'https://drawingdatabase.com/excelsior-tank-a33/',
  'https://drawingdatabase.com/lexus-ct-2019/',
  'https://drawingdatabase.com/opel-vivaro-2017/',
  'https://drawingdatabase.com/mercedes-benz-amg-e43-2017/',
  'https://drawingdatabase.com/porsche-macan-2016/',
  'https://drawingdatabase.com/chevrolet-suburban-2009/',
  'https://drawingdatabase.com/rumpler-d-i/',
  'https://drawingdatabase.com/bell-p-63-kingcobra/',
  'https://drawingdatabase.com/lavochkin-gorbunov-gudkov-lagg-3/',
  'https://drawingdatabase.com/henschel-hs-123/',
  'https://drawingdatabase.com/kai-t-50-golden-eagle/',
  'https://drawingdatabase.com/thunder-child-ii-high-speed-patrol-boat/',
  'https://drawingdatabase.com/citroen-c8-2006/',
  'https://drawingdatabase.com/ford-ranger-raptor-2022/',
  'https://drawingdatabase.com/aerion-as2/',
  'https://drawingdatabase.com/renault-trafic-2006/',
  'https://drawingdatabase.com/sikorsky-s-64-skycrane/',
  'https://drawingdatabase.com/northrop-xp-56-black-bullet/',
  'https://drawingdatabase.com/north-american-rockwell-ov-10-bronco/',
  'https://drawingdatabase.com/learjet-25/',
  'https://drawingdatabase.com/mazda-cx-7-2007/',
  'https://drawingdatabase.com/yamaha-jog/',
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
    const pool = game.duration_seconds <= 18000 ? blueprints5h : blueprints1j
    brief = {
      brief_objet:   random(objets),
      brief_style:   random(styles),
      blueprint_url: random(pool),
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
