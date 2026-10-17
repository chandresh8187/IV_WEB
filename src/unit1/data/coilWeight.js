export function averageCoilWeightKg(totalWeightKg, coilQty) {
  const total = Number(totalWeightKg)
  const qty = Number(coilQty)
  if (!Number.isFinite(total) || !Number.isSafeInteger(qty) || qty < 1) return null
  return total / qty
}

export function allocatedCoilWeightKg(totalWeightKg, coilQty, coilNumber) {
  const totalGrams = Math.round(Number(totalWeightKg) * 1000)
  const qty = Number(coilQty)
  const number = Number(coilNumber)
  if (!Number.isSafeInteger(totalGrams) || totalGrams < 0 || !Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(number) || number < 1 || number > qty) return null
  return (Math.floor(totalGrams / qty) + (number <= totalGrams % qty ? 1 : 0)) / 1000
}
