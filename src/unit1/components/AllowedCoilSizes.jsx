export default function AllowedCoilSizes({value=[],onChange,disabled=false}){
 return <fieldset className="planning-material"><legend>Allowed coil sizes</legend><p>Enter width and thickness manually. QR generation is not required yet. Production accepts a scanned coil only when both dimensions match one of these sizes.</p>
  {value.map((row,index)=><div className="planning-fields" key={index}>
   <label>Allowed coil width {index+1} (mm)<input inputMode="decimal" required value={row.widthMm??''} disabled={disabled} onChange={e=>onChange(value.map((r,i)=>i===index?{...r,widthMm:e.target.value}:r))}/></label>
   <label>Allowed coil thickness {index+1} (mm)<input inputMode="decimal" required value={row.thicknessMm??''} disabled={disabled} onChange={e=>onChange(value.map((r,i)=>i===index?{...r,thicknessMm:e.target.value}:r))}/></label>
   {value.length>1&&<button type="button" className="outline-button" disabled={disabled} onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove size {index+1}</button>}
  </div>)}
  <button type="button" className="outline-button" disabled={disabled||value.length>=100} onClick={()=>onChange([...value,{widthMm:'',thicknessMm:''}])}>Add coil size</button>
 </fieldset>;
}
