const numberText = value =>
  Number.isFinite(Number(value)) ? String(Number(value)) : String(value ?? '');
const normalize = value =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(\d)\s*mm\b/g, '$1')
    .replace(/\s*[x×*]\s*/g, 'x')
    .replace(
      /(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/g,
      (_, w, t) => `${Number(w)}x${Number(t)}`,
    )
    .replace(/\s+/g, ' ')
    .trim();
export function matchesCoilSearch(coil, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const text = normalize(
    [
      coil.internalId,
      coil.invoice,
      coil.materialType,
      coil.grade,
      `${numberText(coil.widthMm)}x${numberText(coil.thicknessMm)}`,
      coil.widthMm,
      coil.thicknessMm,
    ]
      .filter(v => v != null)
      .join(' '),
  );
  return tokens.every(token => text.includes(token));
}
