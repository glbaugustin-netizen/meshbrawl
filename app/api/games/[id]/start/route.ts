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
  'https://www.the-blueprints.com/blueprints/cars/audi/4769/view/audi_a3_2003/',
  'https://www.the-blueprints.com/blueprints/cars/bmwcars/27529/view/bmw_3-series_e90/',
  'https://www.the-blueprints.com/blueprints/cars/bmwcars/93/view/bmw_m3_convertible_e46/',
  'https://www.the-blueprints.com/blueprints/cars/mitsubishi/19476/view/mitsubishi_eclipse_convertible_2001/',
  'https://www.the-blueprints.com/blueprints/cars/range-rover/92545/view/range_rover_velar_2018/',
  'https://www.the-blueprints.com/blueprints/cars/subaru/83919/view/subaru_impreza_2007/',
  'https://www.the-blueprints.com/blueprints/cars/porsche/77238/view/porsche_356c_1964/',
  'https://www.the-blueprints.com/blueprints/cars/ford/30258/view/ford_crown_victoria_police_interceptor_2004/',
  'https://www.the-blueprints.com/blueprints/cars/suzuki/17223/view/suzuki_jimny_hard_top_2007/',
  'https://www.the-blueprints.com/blueprints/cars/dodge/62376/view/dodge_challenger_1970/',
  'https://www.the-blueprints.com/blueprints/cars/renault/59413/view/renault_5_gtl_5-door_1983/',
  'https://www.the-blueprints.com/blueprints/cars/kia/83590/view/kia_ceed_5-door_gt_2019/',
  'https://www.the-blueprints.com/blueprints/modernplanes/lockheed/27152/view/lockheed_c-5_galaxy/',
  'https://www.the-blueprints.com/blueprints/modernplanes/modern-sa-st/47229/view/sncaso_so-9050_trident_ii/',
  'https://www.the-blueprints.com/blueprints/modernplanes/modern-sa-st/85891/view/sepecat_jaguar/',
  'https://www.the-blueprints.com/blueprints/modernplanes/antonov/46787/view/antonov_an-8_camp/',
  'https://www.the-blueprints.com/blueprints/modernplanes/modern-t/75998/view/transavia_pl13/',
  'https://www.the-blueprints.com/blueprints/modernplanes/dassault/68674/view/dassault_etendard_vi/',
  'https://www.the-blueprints.com/blueprints/modernplanes/dassault/73549/view/dassault_mirage_2000b/',
  'https://www.the-blueprints.com/blueprints/modernplanes/modern-su-sz/18737/view/szd-12_mucha_100/',
  'https://www.the-blueprints.com/blueprints/modernplanes/tupolev/85992/view/tupolev_tu-134a_crusty/',
  'https://www.the-blueprints.com/blueprints/modernplanes/tupolev/86014/view/tupolev_tu-22_blinder_a/',
  'https://www.the-blueprints.com/blueprints/trucks/trucks-cars/51585/view/alfa_romeo_a11_1977/',
  'https://www.the-blueprints.com/blueprints/trucks/trucks-cars/52944/view/austin_10hp_4x2_ight_utility_tily/',
  'https://www.the-blueprints.com/blueprints/trucks/renault-trucks/1076/view/renault_primium/',
  'https://www.the-blueprints.com/blueprints/trucks/man/79284/view/man_8x8_10t_1984/',
  'https://www.the-blueprints.com/blueprints/motorcycles/bmwmotor/73239/view/bmw_k75s_1985/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/87718/view/m1_abrams_105mm/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/75189/view/m109_155mm_spg/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/75198/view/m18_hellcat_76mm_gun_motor_carriage/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/44982/view/m1a2_abrams_trumpeter/',
  'https://www.the-blueprints.com/blueprints/tanks/tanks-m/81724/view/m2_half_truck/',
  'https://www.the-blueprints.com/blueprints/ww2planes/ww2english/68969/view/boulton-paul_defiant_mki/',
  'https://www.the-blueprints.com/blueprints/ww2planes/ww2-german/70912/view/fokker_dxxiii/',
  'https://drawingdatabase.com/zubr-a80-1960/',
  'https://drawingdatabase.com/iveco-eurocargo-ml-75-e-14/',
  'https://drawingdatabase.com/volvo-vnl-tractor-truck-2018/',
  'https://drawingdatabase.com/iveco-daily-chassis-truck-2021/',
  'https://drawingdatabase.com/kenworth-t660-tractor-truck-2008/',
  'https://drawingdatabase.com/volvo-f12-20-truck-1979/',
  'https://drawingdatabase.com/opel-blitz-ambulance/',
  'https://drawingdatabase.com/honda-monkey-125-2018/',
  'https://drawingdatabase.com/honda-gold-wing/',
  'https://drawingdatabase.com/lockheed-martin-f-22-raptor/',
  'https://drawingdatabase.com/fairchild-republic-a-10-thunderbolt-ii/',
  'https://drawingdatabase.com/bernard-h-110/',
  'https://drawingdatabase.com/airbus-a220/',
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
