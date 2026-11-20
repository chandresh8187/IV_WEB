import { printCount } from './invoiceQrLabels.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const labelText = value => escape(String(value ?? '').toUpperCase());

export function materialStockQrLabels(stock, image, copies, bundleQuantity) {
  const count = printCount(copies);
  if (!count) throw new Error('Enter a positive whole print quantity.');
  const quantity = printCount(bundleQuantity);
  if (!quantity) throw new Error('Enter the pieces in one bundle as a positive whole number.');
  const section = String(stock.sectionSize ?? '').trim().replace(/\s*mm$/i, '').trim().replace(/\s*[x×*]\s*/gi, 'X');
  const length = stock.lengthMm == null || String(stock.lengthMm).trim() === '' ? '' : Number.isFinite(Number(stock.lengthMm)) ? Math.ceil(Number(stock.lengthMm)) : stock.lengthMm;
  const label = `<article><img src="${escape(image)}" alt="MATERIAL STOCK QR" width="128" height="128"/><div class="details"><strong>${labelText(stock.customerName || 'Party not recorded')}</strong><b>${labelText(stock.memberName)}</b><span>${labelText(section)} - ${labelText(length)}MM</span><small>BUNDLE QTY: ${quantity.toLocaleString('en-IN')} NOS</small></div></article>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><title>MATERIAL BUNDLE QR LABELS</title><style>@page{margin:10mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;margin:0;color:#111;background:#fff}main{display:flex;flex-wrap:wrap;gap:12px}article{width:350px;display:flex;align-items:center;gap:14px;border:1px solid #ccc;padding:12px;text-align:left;break-inside:avoid;page-break-inside:avoid}article img{display:block;width:128px;height:128px;flex:0 0 128px}.details{min-width:0;display:flex;flex-direction:column;gap:7px;overflow-wrap:anywhere}.details strong{font-size:13px;line-height:1.25}.details b{font-size:14px;line-height:1.3}.details span,.details small{font-size:12px;line-height:1.4}</style></head><body><main>${Array.from({ length: count }, () => label).join('')}</main></body></html>`;
}
