/**
 * EstimatorPDF.tsx
 * -----------------
 * A print-quality PDF template built with @react-pdf/renderer.
 *
 * Install:  npm install @react-pdf/renderer
 *
 * Usage (server-side, e.g. in a Next.js API route):
 *
 *   import { renderToBuffer } from '@react-pdf/renderer'
 *   import { EstimatorPDF } from '@/components/EstimatorPDF'
 *
 *   const buffer = await renderToBuffer(
 *     <EstimatorPDF project={project} contractor={contractor} />
 *   )
 *   return new Response(buffer, {
 *     headers: { 'Content-Type': 'application/pdf' }
 *   })
 *
 * Usage (client-side download button):
 *
 *   import { PDFDownloadLink } from '@react-pdf/renderer'
 *   <PDFDownloadLink document={<EstimatorPDF ... />} fileName="arajanlat.pdf">
 *     {({ loading }) => loading ? 'Generálás…' : 'Letöltés'}
 *   </PDFDownloadLink>
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import { Project, Contractor, ProjectTotals } from '../types'
import { calculateProject, formatHUF } from '../lib/calculator'

// ── Register fonts (optional — remove if you don't host these) ───────────────
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff', fontWeight: 700 },
  ],
})

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  dark: '#18181B',
  mid: '#3F3F46',
  muted: '#71717A',
  subtle: '#F4F4F5',
  white: '#FFFFFF',
  border: '#E4E4E7',
  text: '#09090B',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: C.text,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: C.white,
  },

  // ── Header band ──
  headerBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: C.amber,
  },
  logo: { width: 44, height: 44, borderRadius: 8 },
  brandName: { fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 2 },
  brandSub: { fontSize: 8, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  invoiceTitle: { fontSize: 22, fontWeight: 700, color: C.amber, textAlign: 'right' },
  invoiceNumber: { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 2 },

  // ── Two-column party section ──
  partyRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  partyBox: {
    flex: 1,
    backgroundColor: C.subtle,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
  },
  partyLabel: { fontSize: 7, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  partyName: { fontSize: 11, fontWeight: 700, color: C.dark, marginBottom: 3 },
  partyLine: { fontSize: 8.5, color: C.mid, marginBottom: 2, lineHeight: 1.5 },

  // ── Items table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    borderRadius: 4,
    padding: '7 10',
    marginBottom: 2,
  },
  tableHeaderText: { fontSize: 7.5, fontWeight: 700, color: C.white, letterSpacing: 0.8, textTransform: 'uppercase' },

  tableRow: {
    flexDirection: 'row',
    padding: '8 10',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: C.subtle },
  catBadge: {
    fontSize: 7,
    fontWeight: 700,
    color: C.amber,
    backgroundColor: C.amberLight,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  itemName: { fontSize: 9, color: C.dark },
  cellRight: { textAlign: 'right', fontSize: 9, color: C.mid },
  cellRightBold: { textAlign: 'right', fontSize: 9, fontWeight: 700, color: C.dark },

  // Column widths (must sum to ~100%)
  colDesc: { flex: 3.5 },
  colUnit: { flex: 1, textAlign: 'center' },
  colQty: { flex: 0.8, textAlign: 'center' },
  colNet: { flex: 1.4, textAlign: 'right' },
  colVat: { flex: 1.2, textAlign: 'right' },
  colGross: { flex: 1.6, textAlign: 'right' },

  // ── Totals block ──
  totalsWrap: { marginTop: 16, alignItems: 'flex-end' },
  totalsTable: { width: 260 },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalsLabel: { fontSize: 9, color: C.muted },
  totalsValue: { fontSize: 9, color: C.dark, fontWeight: 700 },
  totalGrossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.amber,
    borderRadius: 6,
    padding: '9 12',
    marginTop: 6,
  },
  totalGrossLabel: { fontSize: 11, fontWeight: 700, color: C.dark },
  totalGrossValue: { fontSize: 11, fontWeight: 700, color: C.dark },

  // ── Notes & Footer ──
  notesBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: C.subtle,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: C.mid,
  },
  notesLabel: { fontSize: 7.5, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 8.5, color: C.mid, lineHeight: 1.6 },

  pageNumber: { position: 'absolute', bottom: 24, right: 48, fontSize: 8, color: C.muted },
  footer: { position: 'absolute', bottom: 24, left: 48, fontSize: 8, color: C.muted },
})

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  project: Project
  contractor: Contractor
  invoiceNumber?: string
}

export function EstimatorPDF({ project, contractor, invoiceNumber }: Props) {
  const totals: ProjectTotals = calculateProject(project)
  const dateStr = new Date(project.createdAt).toLocaleDateString('hu-HU')
  const validStr = new Date(project.validUntil).toLocaleDateString('hu-HU')
  const docNumber = invoiceNumber ?? `EP-${project.id.slice(0, 6).toUpperCase()}`

  return (
    <Document
      title={`Árajánlat – ${project.name}`}
      author={contractor.name}
      subject="Estimator Pro árajánlat"
    >
      <Page size="A4" style={s.page}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <View style={s.headerBand}>
          <View>
            {contractor.logoUrl && <Image style={s.logo} src={contractor.logoUrl} />}
            <Text style={s.brandName}>{contractor.name}</Text>
            <Text style={s.brandSub}>Estimator Pro · Árajánlat</Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>ÁRAJÁNLAT</Text>
            <Text style={s.invoiceNumber}>{docNumber}</Text>
            <Text style={[s.invoiceNumber, { marginTop: 4 }]}>Kelt: {dateStr}</Text>
            <Text style={s.invoiceNumber}>Érvényes: {validStr}</Text>
          </View>
        </View>

        {/* ── PARTIES ────────────────────────────────────────────────── */}
        <View style={s.partyRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Vállalkozó</Text>
            <Text style={s.partyName}>{contractor.name}</Text>
            <Text style={s.partyLine}>{contractor.address}</Text>
            <Text style={s.partyLine}>Adószám: {contractor.taxNumber}</Text>
            <Text style={s.partyLine}>{contractor.email}</Text>
            <Text style={s.partyLine}>{contractor.phone}</Text>
            {contractor.bankAccount && (
              <Text style={s.partyLine}>Számlaszám: {contractor.bankAccount}</Text>
            )}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Megrendelő</Text>
            <Text style={s.partyName}>{project.client.name}</Text>
            <Text style={s.partyLine}>{project.client.address}</Text>
            {project.client.taxNumber && (
              <Text style={s.partyLine}>Adószám: {project.client.taxNumber}</Text>
            )}
            <Text style={s.partyLine}>{project.client.email}</Text>
            {project.client.contactPerson && (
              <Text style={s.partyLine}>Kapcsolat: {project.client.contactPerson}</Text>
            )}
            <Text style={[s.partyLine, { marginTop: 4, fontWeight: 700 }]}>
              Helyszín: {project.address}
            </Text>
          </View>
        </View>

        {/* ── ITEMS TABLE ─────────────────────────────────────────────── */}
        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Tétel megnevezése</Text>
          <Text style={[s.tableHeaderText, s.colUnit, { textAlign: 'center' }]}>Egység</Text>
          <Text style={[s.tableHeaderText, s.colQty, { textAlign: 'center' }]}>Menny.</Text>
          <Text style={[s.tableHeaderText, s.colNet, { textAlign: 'right' }]}>Nettó</Text>
          <Text style={[s.tableHeaderText, s.colVat, { textAlign: 'right' }]}>ÁFA</Text>
          <Text style={[s.tableHeaderText, s.colGross, { textAlign: 'right' }]}>Bruttó</Text>
        </View>

        {/* Table rows */}
        {totals.items.map((item, idx) => (
          <View key={item.id} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
            <View style={s.colDesc}>
              <Text style={s.catBadge}>{item.category}</Text>
              <Text style={s.itemName}>{item.name}</Text>
            </View>
            <Text style={[s.cellRight, s.colUnit, { textAlign: 'center' }]}>{item.unit}</Text>
            <Text style={[s.cellRight, s.colQty, { textAlign: 'center' }]}>{item.quantity}</Text>
            <Text style={[s.cellRight, s.colNet]}>{formatHUF(item.netPrice)}</Text>
            <Text style={[s.cellRight, s.colVat]}>{formatHUF(item.vatAmount)}</Text>
            <Text style={[s.cellRightBold, s.colGross]}>{formatHUF(item.grossPrice)}</Text>
          </View>
        ))}

        {/* ── TOTALS ──────────────────────────────────────────────────── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsTable}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Nettó összesen</Text>
              <Text style={s.totalsValue}>{formatHUF(totals.totalNet)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>ÁFA ({project.vatPct}%)</Text>
              <Text style={s.totalsValue}>{formatHUF(totals.totalVat)}</Text>
            </View>
            <View style={s.totalGrossRow}>
              <Text style={s.totalGrossLabel}>FIZETENDŐ ÖSSZEG</Text>
              <Text style={s.totalGrossValue}>{formatHUF(totals.totalGross)}</Text>
            </View>
          </View>
        </View>

        {/* ── NOTES ───────────────────────────────────────────────────── */}
        {project.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Megjegyzések</Text>
            <Text style={s.notesText}>{project.notes}</Text>
          </View>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <Text style={s.footer}>
          {contractor.name} · {contractor.email} · {contractor.phone}
        </Text>
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
