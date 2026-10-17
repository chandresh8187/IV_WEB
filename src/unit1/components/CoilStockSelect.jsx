import LoadingIndicator from "../../components/LoadingIndicator";
import { useId, useState } from "react";
import { MATERIAL_LABELS } from "../data/materialGrades";

const normalize = value => String(value).toLowerCase().replace(/[×*]/g, "x").replace(/\s+/g, "");
const labelFor = coil => `${MATERIAL_LABELS[coil.materialType] || coil.materialType} · ${coil.widthMm} × ${coil.thicknessMm} mm · ${coil.availableQty} available`;

export default function CoilStockSelect({ coils = [], value, onChange, editing, loading }) {
  const [search, setSearch] = useState("");
  const id = useId();
  const matches = coils.filter(coil => normalize(labelFor(coil)).includes(normalize(search)));
  const selected = coils.find(coil => String(coil.id) === String(value));
  const options = selected && !matches.includes(selected) ? [selected, ...matches] : matches;
  return <div className="form-field">
    <label htmlFor={id}>{editing ? "Change stock coil" : "Available stock coil"}</label>
    <input type="search" aria-label="Search available stock coils" placeholder="Search material or size, e.g. MS or 178x2" value={search} onChange={event => setSearch(event.target.value)} />
    <select id={id} disabled={loading} aria-busy={Boolean(loading)} required={!editing} value={value || ""} onChange={event => { onChange(event.target.value); setSearch(""); }}>
      <option value="">{loading ? "Loading stock…" : editing ? "Keep current coil specification" : "Select coil from stock"}</option>
      {options.map(coil => <option key={coil.id} value={coil.id}>{labelFor(coil)}</option>)}
    </select>
    {loading && <LoadingIndicator label="Loading stock…" inline />}
    {search && <small role="status">{matches.length ? `${matches.length} matching coil options` : "No matching coils. Try another material or size."}</small>}
  </div>;
}
