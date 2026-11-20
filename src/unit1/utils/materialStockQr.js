export function materialStockQrPayload(stock){const key=typeof stock==='string'?stock:stock?.key;if(!/^[a-f0-9]{64}$/.test(String(key)))throw new Error('Select a valid material stock row.');return JSON.stringify({type:'unit1-material-stock',version:1,key});}

export function parseMaterialStockQr(value){try{const data=JSON.parse(String(value));return data.type==='unit1-material-stock'&&data.version===1&&/^[a-f0-9]{64}$/.test(data.key)?data.key:null;}catch{return null;}}
