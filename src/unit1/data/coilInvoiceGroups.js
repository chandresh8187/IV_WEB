const keyPart = value => String(value || '').trim().toUpperCase()

export const coilInvoiceKey = coil => coil.invoice
  ? [keyPart(coil.invoice), String(coil.invoiceDate || '').slice(0, 10), keyPart(coil.vendorCode)].join('|')
  : `batch:${coil.id}`

export function groupCoilInvoices(coils = []) {
  const groups = new Map()
  for (const coil of coils) {
    const key = coilInvoiceKey(coil)
    if (!groups.has(key)) groups.set(key, { key, id: coil.id, invoice: coil.invoice, invoiceDate: coil.invoiceDate, vendorCode: coil.vendorCode, batches: [], coilQty: 0, availableQty: 0, totalWeightKg: 0, theoreticalUsedKg: 0, holeScrapKg: 0, theoreticalRemainingKg: 0 })
    const group = groups.get(key)
    group.batches.push(coil)
    group.coilQty += Number(coil.coilQty || 1)
    group.availableQty += Number(coil.availableQty ?? coil.coilQty ?? 1)
    group.totalWeightKg += Number(coil.totalWeightKg ?? coil.actualNetKg ?? 0)
    group.theoreticalUsedKg += Number(coil.theoreticalUsedKg || 0)
    group.holeScrapKg = group.holeScrapKg == null || coil.holeScrapKg == null ? null : group.holeScrapKg + Number(coil.holeScrapKg)
    group.theoreticalRemainingKg += Number(coil.theoreticalRemainingKg ?? coil.totalWeightKg ?? 0)
  }
  return [...groups.values()]
}
