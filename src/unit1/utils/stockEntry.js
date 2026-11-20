export const sizeLabel=s=>`${Number(s.widthMm)} × ${Number(s.thicknessMm)} mm · ${s.materialType} · ${s.grade}`;
export const sizeKey=s=>JSON.stringify([Number(s.widthMm),Number(s.thicknessMm),String(s.materialType).trim().toUpperCase(),String(s.grade).trim().toUpperCase()]);
export function sizeSuggestions(sizes,lines,query){const all=new Map();for(const s of [...sizes,...lines])all.set(sizeKey(s),s);const q=query.trim().toLowerCase().replace(/[×*]/g,'x').replace(/\s|mm/g,'');return [...all.values()].filter(s=>sizeLabel(s).toLowerCase().replace(/×/g,'x').replace(/\s|mm/g,'').includes(q));}
export const validLine=l=>l&&typeof l.tcNumber==='string'&&l.tcNumber.trim().length>0&&l.tcNumber.trim().length<=100&&!/[\x00-\x1f\x7f]/.test(l.tcNumber)&&/^([1-9]\d*)$/.test(String(l.coilQty))&&Number(l.coilQty)<=1000&&['totalWeightKg','ratePerKg'].every(k=>/^\d+(?:\.\d{1,3})?$/.test(String(l[k]))&&Number(l[k])>0)&&/^\d+(?:\.\d{1,2})?$/.test(String(l.ratePerKg));
export const totalKg=lines=>lines.reduce((n,l)=>n+Math.round(Number(l.totalWeightKg)*1000),0)/1000;

export function parseCoilSize(value){
 const match=String(value).trim().match(/^(\d+(?:\.\d{1,3})?)\s*(?:mm)?\s*[x×*]\s*(\d+(?:\.\d{1,3})?)\s*(?:mm)?$/i);
 if(!match||match.slice(1).some(v=>Number(v)<=0||Number(v)>=1000000))return null;
 return {widthMm:match[1],thicknessMm:match[2]};
}
