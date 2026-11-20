// Match rejectedUsedKg on the server, including one blade cut per piece.
export function rejectedCoilKg(run, job, lines) {
  if (!lines.length) return 0;
  const width = Number(run.widthMm), thickness = Number(run.thicknessMm);
  const density = Number(run.densityGcm3 ?? 7.85);
  if (![width, thickness, density].every(value => Number.isFinite(value) && value > 0)) return null;
  let bladeThickness;
  const blade = run.cutBladeSizeMm == null ? 0 : Number(run.cutBladeSizeMm);
  if (!Number.isFinite(blade) || blade < 0) return null;
  if (blade > 0) {
    let sizes = job?.allowedCoilSizes;
    if (typeof sizes === 'string') {
      try { sizes = JSON.parse(sizes); } catch { return null; }
    }
    const matched = Array.isArray(sizes) ? sizes.find(size => Number(size.widthMm) === width && Number(size.thicknessMm) === thickness) : null;
    bladeThickness = Number(matched?.thicknessMm ?? job?.coilThicknessMm);
    if (!Number.isFinite(bladeThickness) || bladeThickness <= 0) return null;
  }
  const kg = lines.reduce((sum, line) => {
    const length = Number(line.cutLengthMm), pieces = Number(line.pieces);
    if (!Number.isFinite(length) || length <= 0 || !Number.isInteger(pieces) || pieces <= 0) return NaN;
    const blank = width * thickness * length * pieces * density / 1000000;
    const bladeKg = blade > 0 ? width * bladeThickness * blade * pieces * density / 1000000 : 0;
    return sum + blank + bladeKg;
  }, 0);
  return Number.isFinite(kg) ? Number(kg.toFixed(4)) : null;
}
