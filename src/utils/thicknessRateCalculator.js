export const THICKNESS_ZINC_PERCENTAGES = [
  { thickness: 1.8, min: 6.5, max: 7 },
  { thickness: 2, min: 7, max: 7 },
  { thickness: 2.5, min: 6, max: 6.5 },
  { thickness: 3, min: 4.5, max: 5.5 },
  { thickness: 3.5, min: 4, max: 5 },
  { thickness: 3.8, min: 3, max: 3.5 },
  { thickness: 4, min: 3.5, max: 4.5 },
  { thickness: 4.5, min: 3, max: 4 },
  { thickness: 4.8, min: 3, max: 4 },
  { thickness: 5, min: 3, max: 3.5 },
  { thickness: 5.5, min: 3, max: 3.5 },
  { thickness: 6, min: 2.8, max: 3 },
];

const round = value => Math.round(value * 1000) / 1000;

export function zincRangeForThickness(value) {
  const thickness = Number(value);
  if (!Number.isFinite(thickness) || thickness < 1.8 || thickness > 6) return null;
  const exact = THICKNESS_ZINC_PERCENTAGES.find(row => row.thickness === thickness);
  if (exact) return { min: exact.min, max: exact.max };
  const upperIndex = THICKNESS_ZINC_PERCENTAGES.findIndex(row => row.thickness > thickness);
  const lower = THICKNESS_ZINC_PERCENTAGES[upperIndex - 1];
  const upper = THICKNESS_ZINC_PERCENTAGES[upperIndex];
  const share = (thickness - lower.thickness) / (upper.thickness - lower.thickness);
  return { min: round(lower.min + share * (upper.min - lower.min)), max: round(lower.max + share * (upper.max - lower.max)) };
}

export function calculateThicknessRate(inputs) {
  const errors = {};
  const range = zincRangeForThickness(inputs.thickness);
  if (!range) errors.thickness = 'Enter thickness from 1.8 to 6 mm.';
  const keys = ['zincPercentage', 'drossing', 'zincRate', 'plantCost', 'profit'];
  const values = {};
  for (const key of keys) {
    const text = String(inputs[key] ?? '').trim();
    if (!text && ['zincPercentage', 'zincRate'].includes(key)) {
      values[key] = null;
    } else if (text && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
      errors[key] = 'Enter a valid non-negative number.';
    } else {
      values[key] = text ? Number(text) : 0;
      if (!Number.isFinite(values[key])) errors[key] = 'This number is too large.';
    }
  }
  if (range && values.zincPercentage != null && (values.zincPercentage < range.min - 0.0001 || values.zincPercentage > range.max + 0.0001)) {
    errors.zincPercentage = `Use ${range.min}–${range.max}% for this thickness.`;
  }
  const zincPercentage = range && !errors.zincPercentage ? values.zincPercentage : null;
  const totalZinc = zincPercentage != null && !errors.drossing ? zincPercentage + values.drossing : null;
  const subtotal = totalZinc != null && values.zincRate != null && !errors.zincRate ? values.zincRate * totalZinc / 100 : null;
  const finalRate = subtotal != null && !Object.keys(errors).length ? subtotal + values.plantCost + values.profit : null;
  return { errors, range, zincPercentage, totalZinc, subtotal, finalRate };
}
