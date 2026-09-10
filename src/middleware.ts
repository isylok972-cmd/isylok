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

// Cache mémoire local pour la vérification de licence (TTL 10s)
interface CacheLicence {
  timestamp: number
  data: {
    estActif: boolean
    estExpire: boolean
    modulesConfig: Record<string, boolean>
  }
}

let cacheLicence: CacheLicence | null = null
const CACHE_TTL_MS = 10000 // 10 secondes

// Mapping des routes vers les identifiants de modules
const ROUTES_VERS_MODULES: { prefixe: string; module: string }[] = [
  { prefixe: '/stocks', module: 'stocks' },
  { prefixe: '/api/stocks', module: 'stocks' },
  { prefixe: '/commercial', module: 'commercial' },
  { prefixe: '/api/commercial', module: 'commercial' },
  { prefixe: '/planning', module: 'planning' },
  { prefixe: '/planification', module: 'planning' },
  { prefixe: '/api/planning', module: 'planning' },
  { prefixe: '/atelier', module: 'atelier' },
  { prefixe: '/api/atelier', module: 'atelier' },
  { prefixe: '/terrain', module: 'terrain' },
  { prefixe: '/livreur', module: 'terrain' },
  { prefixe: '/api/terrain', module: 'terrain' },
  { prefixe: '/api/livreur', module: 'terrain' },
  { prefixe: '/achats', module: 'achats' },
  { prefixe: '/api/achats', module: 'achats' },
  { prefixe: '/rh', module: 'rh' },
  { prefixe: '/api/rh', module: 'rh' },
  { prefixe: '/cautions', module: 'cautions' },
  { prefixe: '/api/cautions', module: 'cautions' },
  { prefixe: '/admin/web', module: 'web' },
  { prefixe: '/direction', module: 'direction' },
  { prefixe: '/api/direction', module: 'direction' },
]

async function obtenirEtatLicence(origin: string) {
  const maintenant = Date.now()
  if (cacheLicence && (maintenant - cacheLicence.timestamp < CACHE_TTL_MS)) {
    return cacheLicence.data
  }

  try {
    const res = await fetch(`${origin}/api/saas/verif`, {
      headers: { 'x-middleware-request': '1' }
    })
    const data = await res.json()
    if (data.succes) {
      cacheLicence = {
        timestamp: maintenant,
        data: {
          estActif: data.estActif ?? true,
          estExpire: data.estExpire ?? false,
          modulesConfig: data.modulesConfig || {}
        }
      }
      return cacheLicence.data
    }
  } catch (err) {
    // Si échec réseau, réutiliser l'ancien cache ou autoriser par défaut
    if (cacheLicence) return cacheLicence.data
  }

  return {
    estActif: true,
    estExpire: false,
    modulesConfig: {}
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') || ''

  // 1. Fichiers statiques et images du dossier public
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

  if (pathname === '/catalogue' || pathname.startsWith('/catalogue/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/catalogue/, '/vitrine/catalogue')
    return NextResponse.rewrite(url)
  }

  if (pathname === '/' && (isWwwSubdomain || modeParam === 'vitrine')) {
    const url = request.nextUrl.clone()
    url.pathname = '/vitrine'
    return NextResponse.rewrite(url)
  }

  // 3. Définition des routes publiques toujours autorisées sans authentification
  const isPublicRoute =
    pathname === '/connexion' ||
    pathname.startsWith('/connexion/') ||
    pathname === '/abonnement-expire' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/web') ||
    pathname === '/api/saas/verif' ||
    pathname === '/vitrine' ||
    pathname.startsWith('/vitrine/') ||
    pathname === '/catalogue' ||
    pathname.startsWith('/catalogue/') ||
    pathname === '/devis' ||
    pathname.startsWith('/devis/')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 4. Vérification de l'authentification
  const userId = request.cookies.get('isylok_user_id')?.value
  const role = request.cookies.get('isylok_role')?.value

  if (!userId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { succes: false, message: 'Accès non autorisé. Authentification requise.' },
        { status: 401 }
      )
    }

    const loginUrl = new URL('/connexion', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 5. SUPER_ADMIN : Accès illimité et exclusif
  if (role === 'SUPER_ADMIN') {
    return NextResponse.next()
  }

  // Si un utilisateur non Super Admin tente d'accéder à la console SaaS
  if (pathname === '/saas' || pathname.startsWith('/saas/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 6. Vérification de la Licence SaaS pour tous les autres utilisateurs
  const etatLicence = await obtenirEtatLicence(request.nextUrl.origin)

  // Si la licence est expirée ou suspendue
  if (!etatLicence.estActif || etatLicence.estExpire) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { succes: false, message: 'Abonnement SaaS expiré ou suspendu. Accès restreint.' },
        { status: 403 }
      )
    }

    const expireUrl = new URL('/abonnement-expire', request.url)
    return NextResponse.redirect(expireUrl)
  }

  // 7. Vérification des modules activés/désactivés
  for (const item of ROUTES_VERS_MODULES) {
    if (pathname === item.prefixe || pathname.startsWith(item.prefixe + '/')) {
      if (etatLicence.modulesConfig[item.module] === false) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { succes: false, message: `Le module "${item.module}" est désactivé sur votre licence.` },
            { status: 403 }
          )
        }

        const dashboardUrl = new URL('/', request.url)
        dashboardUrl.searchParams.set('erreur', `module_${item.module}_desactive`)
        return NextResponse.redirect(dashboardUrl)
      }
      break
    }
  }

  return NextResponse.next()
}

export default middleware
