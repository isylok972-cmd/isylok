import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const host = req.headers.get('host') || ''

  // 1. Détection sous-domaine
  const isAppSubdomain = host.startsWith('app.')
  const isWwwSubdomain = host.startsWith('www.')

  // 2. Détection paramètre d'URL explicite pour les tests locaux (?mode=vitrine ou ?mode=app)
  const modeParam = searchParams.get('mode')

  // Si on est sur le sous-domaine www ou en mode vitrine explicite sur la racine
  if (pathname === '/' && (isWwwSubdomain || modeParam === 'vitrine')) {
    const url = req.nextUrl.clone()
    url.pathname = '/vitrine'
    return NextResponse.rewrite(url)
  }

  // Si on est sur app.localhost ou app.* et qu'on tente d'accéder à /vitrine directement,
  // on redirige vers l'accueil de gestion
  if (isAppSubdomain && pathname === '/vitrine') {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclure formellement l'API, les fichiers statiques Next, favicon et images
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
