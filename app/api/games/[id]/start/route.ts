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

// Contextes partagés par toutes les durées du mode imaginaire
const contextes = [
  'Préhistorique', 'Punk', 'Cyberpunk', 'Antique', 'Médiéval',
  'Futuriste', 'Cartoon', 'Réaliste', 'Nature / Organique', 'Sous-marin',
  'Rouillé / Usé', 'Art déco', 'Industriel', 'Solarpunk', 'Dieselpunk',
]

// Objets imaginaire répartis par durée
const objetsImaginaire30min = [
  'Fusée', 'Épée', 'Hache', 'Bouclier', 'Arc', 'Pistolet', 'Canon',
  'Poignard', 'Lance', 'Phare', 'Cage', 'Totem', 'Téléphone', 'Sceptre',
  'Lampe', 'Marteau', 'Réacteur', 'Coffre au trésor',
]

const objetsImaginaire1h = [
  'Trottinette', 'Vélo', 'Skateboard', 'Perceuse', 'Montre',
  'Ordinateur', 'Casque', 'Sac à dos', 'Appareil photo', 'Chalumeau',
]

const objetsImaginaire1j = [
  'Moto', 'Tank', 'Sous-marin', 'Bateau pirate', 'Hélicoptère',
  'Montgolfière', 'Voilier', 'Vaisseau spatial', 'Guitare', 'Violon',
  'Trompette', 'Piano', 'Robot', 'Drone', 'Ordinateur', 'Pont', 'Satellite',
]

// Mode animation — 8 styles d'animation imposés
const ANIMATION_STYLES = [
  'Film réaliste', 'Esthétique', 'Vieux film', 'Noir et blanc',
  'Horreur', 'Publicité', 'Nature / Documentaire', 'Slow motion',
]

// ─── Poly Haven (modèles 3D) ────────────────────────────────────────────────────

type PolyHavenAsset = { asset_id: string; name: string; thumbnail: string; page: string }

function polyHavenAsset(id: string, name: string): PolyHavenAsset {
  return {
    asset_id:  id,
    name,
    thumbnail: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=512&height=512`,
    page:      `https://polyhaven.com/a/${id}`,
  }
}

// Assets de secours si l'API Poly Haven est indisponible (slugs réels)
const POLYHAVEN_FALLBACK: PolyHavenAsset[] = [
  polyHavenAsset('potted_plant_01', 'Potted Plant 01'),
  polyHavenAsset('concrete_cat_statue', 'Concrete Cat Statue'),
  polyHavenAsset('fire_extinguisher', 'Fire Extinguisher'),
  polyHavenAsset('garden_gnome', 'Garden Gnome'),
  polyHavenAsset('horse_statue_01', 'Horse Statue 01'),
  polyHavenAsset('wooden_chair_02', 'Wooden Chair 02'),
  polyHavenAsset('vintage_record_player', 'Vintage Record Player'),
]

// Tire un modèle 3D aléatoire depuis l'API publique Poly Haven (serveur uniquement).
// Fallback sur la liste en dur si l'API est down.
async function getPolyHavenAsset(): Promise<PolyHavenAsset> {
  try {
    const res = await fetch('https://api.polyhaven.com/assets?type=models')
    if (!res.ok) throw new Error('Poly Haven indisponible')
    const data = (await res.json()) as Record<string, { name?: string }>
    const keys = Object.keys(data)
    if (keys.length === 0) throw new Error('Aucun asset')
    const id = keys[Math.floor(Math.random() * keys.length)]
    return polyHavenAsset(id, data[id]?.name ?? id)
  } catch {
    return random(POLYHAVEN_FALLBACK)
  }
}

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
  let animationAsset: PolyHavenAsset | null = null

  if (game.mode === 'imaginaire') {
    // Objet selon la durée (le mode imaginaire bloque 5h et 1 semaine)
    const objetPool =
      game.duration_seconds <= 1800 ? objetsImaginaire30min
      : game.duration_seconds <= 3600 ? objetsImaginaire1h
      : objetsImaginaire1j
    brief = {
      brief_objet: random(objetPool),
      brief_style: random(contextes),
    }
  } else if (game.mode === 'texturing') {
    brief = { brief_style: random(styles) }
  } else if (game.mode === 'animation') {
    brief = { brief_style: random(ANIMATION_STYLES) }
    animationAsset = await getPolyHavenAsset()
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
      ...(animationAsset ? { animation_asset: animationAsset } : {}),
    })
    .eq('id', gameId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
