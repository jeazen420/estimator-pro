import { Project, ProjectTotals, CalculatedItem } from '../types'

export function calculateProject(project: Project): ProjectTotals {
  const items: CalculatedItem[] = project.items.map((item) => {
    const directCost = (item.matPrice + item.laborPrice) * item.quantity
    const netPrice = directCost * (1 + project.markupPct / 100)
    const vatAmount = netPrice * (project.vatPct / 100)
    const grossPrice = netPrice + vatAmount
    return { ...item, directCost, netPrice, vatAmount, grossPrice }
  })
  return {
    totalNet: items.reduce((s, i) => s + i.netPrice, 0),
    totalVat: items.reduce((s, i) => s + i.vatAmount, 0),
    totalGross: items.reduce((s, i) => s + i.grossPrice, 0),
    items,
  }
}

export const formatHUF = (n: number) =>
  new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(n)
