import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { EstimatorPDF } from '@/components/EstimatorPDF'
import { Project, Contractor } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[pdf/generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
