import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ succes: false, message: 'Jeton de signature manquant' }, { status: 400 })
    }

    const devis = await prisma.devis.findFirst({
      where: { tokenSignature: token },
      include: {
        client: true,
        lignes: {
          orderBy: { id: 'asc' }
        }
      }
    })

    if (!devis) {
      return NextResponse.json({ succes: false, message: 'Devis introuvable ou lien expiré' }, { status: 404 })
    }

    return NextResponse.json({ succes: true, donnees: devis })
  } catch (err: any) {
    console.error('[API Web Consultation Devis] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const corps = await req.json()
    const { signatureImage, nomSignataire } = corps

    if (!token) {
      return NextResponse.json({ succes: false, message: 'Jeton de signature manquant' }, { status: 400 })
    }

    const devisExistant = await prisma.devis.findFirst({
      where: { tokenSignature: token },
      include: { client: true }
    })

    if (!devisExistant) {
      return NextResponse.json({ succes: false, message: 'Devis introuvable' }, { status: 404 })
    }

    if (devisExistant.statut === 'VALIDE' && devisExistant.signatureClientDate) {
      return NextResponse.json({
        succes: true,
        dejaSigne: true,
        message: 'Ce devis a déjà été validé et signé.',
        donnees: devisExistant
      })
    }

    // Récupérer l'adresse IP du client
    const ipClient = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    const dateSignature = new Date()

    const conditionsMaj = [
      devisExistant.conditions || '',
      `[Signature Électronique En Ligne]`,
      `Signé par : ${nomSignataire || `${devisExistant.client.prenom || ''} ${devisExistant.client.nom}`.trim()}`,
      `Date & Heure : ${dateSignature.toISOString()}`,
      `Adresse IP : ${ipClient}`,
      signatureImage ? `Empreinte signature : Enregistrée (PNG ${signatureImage.length} octets)` : ''
    ].filter(Boolean).join('\n')

    const devisMisAJour = await prisma.devis.update({
      where: { id: devisExistant.id },
      data: {
        statut: 'VALIDE',
        signatureClientDate: dateSignature,
        signatureClientIp: ipClient,
        dateValidation: dateSignature,
        conditions: conditionsMaj
      },
      include: {
        client: true,
        lignes: true
      }
    })

    return NextResponse.json({
      succes: true,
      message: 'Votre devis a été validé et signé avec succès !',
      donnees: devisMisAJour
    })
  } catch (err: any) {
    console.error('[API Web Signature Devis] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}
