export function coilQrPayload(internalId, coilNumber, appUrl) {
  return `${appUrl.replace(/\/$/, '')}/scan/coil/${encodeURIComponent(internalId)}/${coilNumber}`
}
