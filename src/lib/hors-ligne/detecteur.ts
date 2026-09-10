// ===========================================
// Event-Gérance Pro — Détecteur de Réseau
// ===========================================

/**
 * Vérifie la connectivité réelle (pas juste navigator.onLine)
 * en effectuant un ping vers le serveur
 */
export async function verifierConnexion(): Promise<boolean> {
  // Vérification rapide du navigateur
  if (!navigator.onLine) return false

  // Vérification réelle via un ping serveur
  try {
    const reponse = await fetch('/api/ping', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    })
    return reponse.ok
  } catch {
    return false
  }
}

/**
 * Observe les changements de connectivité en continu
 * avec un heartbeat régulier
 */
export function observerConnexion(
  callback: (enLigne: boolean) => void,
  intervalleMs: number = 30000
): () => void {
  let intervalle: NodeJS.Timeout | null = null

  // Écouter les événements navigateur
  const gestionnaireEnLigne = () => callback(true)
  const gestionnaireHorsLigne = () => callback(false)

  window.addEventListener('online', gestionnaireEnLigne)
  window.addEventListener('offline', gestionnaireHorsLigne)

  // Heartbeat régulier pour vérifier la connexion réelle
  intervalle = setInterval(async () => {
    const enLigne = await verifierConnexion()
    callback(enLigne)
  }, intervalleMs)

  // Vérification initiale
  verifierConnexion().then(callback)

  // Retourne une fonction de nettoyage
  return () => {
    window.removeEventListener('online', gestionnaireEnLigne)
    window.removeEventListener('offline', gestionnaireHorsLigne)
    if (intervalle) clearInterval(intervalle)
  }
}
