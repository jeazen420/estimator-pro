export interface LineItem {
  id: string
  category: string
  name: string
  unit: string
  quantity: number
  matPrice: number       // net material price per unit (HUF)
  laborPrice: number     // net labor price per unit (HUF)
}

export interface Contractor {
  name: string
  taxNumber: string
  address: string
  email: string
  phone: string
  bankAccount?: string
  logoUrl?: string
}

export interface Client {
  id: string
  name: string
  taxNumber?: string
  address: string
  email: string
  phone?: string
  contactPerson?: string
  stripeCustomerId?: string   // populated after first Stripe call
}

export interface Project {
  id: string
  name: string
  address: string
  markupPct: number      // e.g. 20 → 20%
  vatPct: number         // e.g. 27 → 27%
  currency: string       // 'HUF' | 'EUR'
  validUntil: string     // ISO date string
  createdAt: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  client: Client
  items: LineItem[]
  notes?: string
  stripeInvoiceId?: string    // populated after Stripe invoice creation
}

export interface CalculatedItem extends LineItem {
  directCost: number
  netPrice: number
  vatAmount: number
  grossPrice: number
}

export interface ProjectTotals {
  totalNet: number
  totalVat: number
  totalGross: number
  items: CalculatedItem[]
}
