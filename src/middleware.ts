import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Configuration du matcher Next.js pour ignorer les assets internes Next
export const config = {
  matcher: [
    /*
     * Appliquer le middleware à toutes les routes sauf :
     * - _next/static (fichiers statiques générés par Next)
     * - _next/image (optimisation d'images Next)
     * - favicon.ico (icône de favori)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') || ''

  // 1. Autoriser les fichiers statiques, assets et images du dossier public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|map)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // 2. Gestion des alias / réécritures publiques vitrine & catalogue
  const isWwwSubdomain = host.startsWith('www.')
  const modeParam = searchParams.get('mode')

  // Redirection / réécriture transparente de /catalogue vers /vitrine/catalogue
  if (pathname === '/catalogue' || pathname.startsWith('/catalogue/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/catalogue/, '/vitrine/catalogue')
    return NextResponse.rewrite(url)
  }

  // Si on est sur www ou ?mode=vitrine sur la racine
  if (pathname === '/' && (isWwwSubdomain || modeParam === 'vitrine')) {
    const url = request.nextUrl.clone()
    url.pathname = '/vitrine'
    return NextResponse.rewrite(url)
  }

  // 3. Définition des routes publiques autorisées
  const isPublicRoute =
    pathname === '/connexion' ||
    pathname.startsWith('/connexion/') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/web') ||
    pathname === '/vitrine' ||
    pathname.startsWith('/vitrine/') ||
    pathname === '/catalogue' ||
    pathname.startsWith('/catalogue/') ||
    pathname === '/devis' ||
    pathname.startsWith('/devis/')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 4. Vérification du cookie d'authentification (isylok_user_id)
  const userId = request.cookies.get('isylok_user_id')?.value

  if (!userId) {
    // Si c'est une requête API interne protégée, retourner une erreur 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { succes: false, message: 'Accès non autorisé. Authentification requise.' },
        { status: 401 }
      )
    }

    // Pour toutes les pages web protégées (dashboard /, /commercial, /stocks, etc.),
    // redirection immédiate vers /connexion
    const loginUrl = new URL('/connexion', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Support export par défaut
export default middleware
