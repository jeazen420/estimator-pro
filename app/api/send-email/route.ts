import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, pdfBase64, fileName } = await req.json()

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY nincs beallitva a Vercelben' },
        { status: 500 }
      )
    }

    const body: any = {
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject,
      html,
    }

    // PDF csatolasa ha van
    if (pdfBase64 && fileName) {
      body.attachments = [{
        filename: fileName,
        content: pdfBase64,
      }]
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[send-email] Resend error:', data)
      return NextResponse.json({ error: data.message ?? 'Resend API hiba' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('[send-email] Hiba:', error)
    return NextResponse.json({ error: 'Email kuldesi hiba' }, { status: 500 })
  }
}
