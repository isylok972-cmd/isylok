import Link from 'next/link'

interface PropsPageModule {
  titre: string
  icone: string
  couleur: string
  description: string
}

export default function PageModuleEnConstruction({ titre, icone, couleur, description }: PropsPageModule) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center',
    }}>
      <Link href="/" style={{
        position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center',
        gap: 8, color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 600,
      }}>
        ← Retour à l&apos;accueil
      </Link>

      <div style={{
        width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${couleur}22, ${couleur}11)`,
        border: `2px solid ${couleur}33`, borderRadius: 24, marginBottom: 24, fontSize: 48,
      }}>
        {icone}
      </div>

      <h1 style={{
        fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800,
        background: `linear-gradient(135deg, ${couleur}, ${couleur}aa)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8,
      }}>
        {titre}
      </h1>

      <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
        {description}
      </p>

      <div style={{
        padding: '12px 24px', background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12,
        color: '#818cf8', fontSize: 14, fontWeight: 600,
      }}>
        🚧 Module en cours de développement
      </div>
    </div>
  )
}
