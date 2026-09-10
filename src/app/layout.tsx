import type { Metadata, Viewport } from 'next'
import './globals.css'
import BandeauInstallationPwa from '@/composants/BandeauInstallationPwa'

export const metadata: Metadata = {
  title: 'Isy Lok — Logistique & Réception',
  description:
    'Application de gestion complète pour la location et vente de matériel événementiel. Devis, stocks, tournées, CRM et logistique terrain.',
  keywords: ['ERP', 'location', 'événementiel', 'gestion', 'devis', 'stocks', 'matériel', 'logistique', 'livraison'],
  authors: [{ name: 'Isy Lok' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Isy Lok',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
}

export default function LayoutRacine({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <div id="racine-app" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
        <BandeauInstallationPwa />
      </body>
    </html>
  )
}
