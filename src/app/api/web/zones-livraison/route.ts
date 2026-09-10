import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const zones = await prisma.optionZoneLivraison.findMany({
      orderBy: [{ ordreAffichage: 'asc' }, { nomZone: 'asc' }]
    })

    return NextResponse.json({ succes: true, donnees: zones })
  } catch (err: any) {
    console.error('[API Web Zones GET] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json()
    const { nomZone, communes, delaiLivraison, tarifEstime, actif, ordreAffichage } = corps

    if (!nomZone || !communes || tarifEstime === undefined) {
      return NextResponse.json({ succes: false, message: 'Nom de zone, communes et tarif requis' }, { status: 400 })
    }

    const zone = await prisma.optionZoneLivraison.create({
      data: {
        nomZone,
        communes,
        delaiLivraison: delaiLivraison || '24h à 48h',
        tarifEstime: Number(tarifEstime) || 0,
        actif: actif !== undefined ? Boolean(actif) : true,
        ordreAffichage: Number(ordreAffichage) || 0
      }
    })

    return NextResponse.json({ succes: true, donnees: zone }, { status: 201 })
  } catch (err: any) {
    console.error('[API Web Zones POST] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const corps = await req.json()
    const { id, nomZone, communes, delaiLivraison, tarifEstime, actif, ordreAffichage } = corps

    if (!id) {
      return NextResponse.json({ succes: false, message: 'ID zone requis' }, { status: 400 })
    }

    const data: any = {}
    if (nomZone !== undefined) data.nomZone = nomZone
    if (communes !== undefined) data.communes = communes
    if (delaiLivraison !== undefined) data.delaiLivraison = delaiLivraison
    if (tarifEstime !== undefined) data.tarifEstime = Number(tarifEstime)
    if (actif !== undefined) data.actif = Boolean(actif)
    if (ordreAffichage !== undefined) data.ordreAffichage = Number(ordreAffichage)

    const zone = await prisma.optionZoneLivraison.update({
      where: { id },
      data
    })

    return NextResponse.json({ succes: true, donnees: zone })
  } catch (err: any) {
    console.error('[API Web Zones PATCH] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ succes: false, message: 'ID requis' }, { status: 400 })
    }

    await prisma.optionZoneLivraison.delete({ where: { id } })
    return NextResponse.json({ succes: true, message: 'Zone supprimée' })
  } catch (err: any) {
    console.error('[API Web Zones DELETE] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}
