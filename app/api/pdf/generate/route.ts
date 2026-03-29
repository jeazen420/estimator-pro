import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { EstimatorPDF } from '@/components/EstimatorPDF'
import { Project, Contractor } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
<<<<<<< HEAD
    const { project, contractor, invoiceNumber }: { project: Project; contractor: Contractor; invoiceNumber?: string } = await req.json()
    const buffer = await renderToBuffer(React.createElement(EstimatorPDF, { project, contractor, invoiceNumber }) as any)
    return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="arajanlat-${project.id}.pdf"` } })
=======
    const { project, contractor, invoiceNumber }: {
      project: Project
      contractor: Contractor
      invoiceNumber?: string
    } = await req.json()

    const buffer = await renderToBuffer(
      React.createElement(EstimatorPDF, { project, contractor, invoiceNumber }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="arajanlat-${project.id}.pdf"`,
      },
    })
>>>>>>> fc5d00013d0fd9117aa9539f710b2dd33b33033a
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
