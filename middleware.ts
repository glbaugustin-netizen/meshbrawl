import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/match', '/attente', '/jeu', '/vote', '/resultats', '/profil']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() vérifie le token côté serveur (pas depuis le cookie seul)
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Redirige vers /auth si route protégée et pas connecté
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Redirige vers / si déjà connecté et essaie d'accéder à /auth
  if (pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/match/:path*',
    '/attente/:path*',
    '/jeu/:path*',
    '/vote/:path*',
    '/resultats/:path*',
    '/profil/:path*',
    '/auth',
  ],
}
