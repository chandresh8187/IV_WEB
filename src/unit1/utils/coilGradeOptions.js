export function coilGradeOptions(material) {
  if (!material) return [];
  if (material.mode === 'number') {
    const min = Number(material.min), max = Number(material.max);
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min || max - min > 1000) return [];
    return Array.from({length:max-min+1},(_,index)=>({value:`GSM - ${min+index}`,label:`GSM - ${min+index}`}));
  }
  return (material.grades || []).map(grade=>({value:String(grade.value),label:String(grade.value)}));
}
