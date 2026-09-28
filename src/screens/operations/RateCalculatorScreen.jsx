import { useEffect, useState } from 'react';
import { getRateCalculatorContextApi } from '../../api/zincStockApi';
import { calculateThicknessRate, zincRangeForThickness } from '../../utils/thicknessRateCalculator';
import './Operations.css';
import './RateCalculatorScreen.css';

const initial = { oldWeight: '', newWeight: '', thickness: '', zincPercentage: '', drossing: '', zincRate: '', plantCost: '', profit: '3' };
const costFields = [['drossing', 'Drossing %'], ['zincRate', 'Zinc rate / kg'], ['plantCost', 'Plant cost / kg'], ['profit', 'Profit / kg']];

export default function RateCalculatorScreen() {
  const [mode, setMode] = useState('weight');
  const [form, setForm] = useState(initial);
  useEffect(() => {
    let active = true;
    getRateCalculatorContextApi().then(response => {
      if (!active) return;
      const rate = response?.data?.current_zinc_rate, plantCost = response?.data?.running_plant_cost;
      setForm(current => ({ ...current, ...(rate != null ? { zincRate: Number(rate).toFixed(2) } : {}), ...(plantCost != null ? { plantCost: Number(plantCost).toFixed(2) } : {}) }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const change = (key, value) => setForm(current => {
    if (key === 'thickness') {
      const range = zincRangeForThickness(value);
      return { ...current, thickness: value, zincPercentage: range ? String(range.max) : '' };
    }
    return { ...current, [key]: value };
  });
  const n = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value || 0)]));
  const weightValid = n.oldWeight > 0 && n.newWeight >= n.oldWeight && n.zincRate >= 0;
  const weightPercent = weightValid ? (n.newWeight - n.oldWeight) / n.oldWeight * 100 : 0;
  const thicknessResult = calculateThicknessRate(form);
  const zincPercent = mode === 'weight' ? weightPercent : thicknessResult.zincPercentage;
  const total = mode === 'weight' ? weightPercent + n.drossing : thicknessResult.totalZinc;
  const zincCost = mode === 'weight' ? n.zincRate * total / 100 : thicknessResult.subtotal;
  const rate = mode === 'weight' ? zincCost + n.plantCost + n.profit : thicknessResult.finalRate;
  const fields = [...(mode === 'weight' ? [['oldWeight', 'Old weight'], ['newWeight', 'New weight']] : [['thickness', 'Thickness (mm)'], ['zincPercentage', 'Zinc percentage (%)']]), ...costFields];
  return <section className="ops-page">
    <header><h2>Rate Calculator</h2><p className="ops-muted">Current zinc rate and this month&apos;s running plant cost are filled automatically and remain editable.</p></header>
    <div className="rate-mode-tabs" role="tablist" aria-label="Calculation method">{[['weight', 'By Weight'], ['thickness', 'By Thickness']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={mode === value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>)}</div>
    <div className="ops-card"><div className="ops-form">{fields.map(([key, label]) => <label className="ops-field" key={key}>{label}<input type="number" min="0" step="0.001" value={form[key]} onChange={event => change(key, event.target.value)} />{mode === 'thickness' && thicknessResult.errors[key] && <span className="rate-field-error">{thicknessResult.errors[key]}</span>}</label>)}</div>
      {mode === 'weight' && !weightValid && form.oldWeight && <div className="ops-error">Old weight must be greater than zero and new weight must be at least the old weight.</div>}
      {mode === 'thickness' && thicknessResult.range && <p className="ops-muted">Reference range for {form.thickness} mm: {thicknessResult.range.min}–{thicknessResult.range.max}%. The higher value is filled by default; you can adjust it within this range.</p>}
      {mode === 'thickness' && <p className="ops-muted">Values between listed thicknesses use a proportional percentage between the neighbouring reference rows.</p>}
    </div>
    <div className="ops-grid"><div className="ops-metric"><small>{mode === 'weight' ? 'Zinc weight increase' : 'Zinc percentage'}</small><strong>{zincPercent == null ? '—' : `${Number(zincPercent).toFixed(3)}%`}</strong></div><div className="ops-metric"><small>Total zinc percentage</small><strong>{total == null ? '—' : `${Number(total).toFixed(3)}%`}</strong></div><div className="ops-metric"><small>Subtotal (zinc cost)</small><strong>{zincCost == null ? '—' : `₹${Number(zincCost).toFixed(2)}/kg`}</strong></div><div className="ops-hero"><small>FINAL RATE</small><strong>{rate == null ? '—' : `₹${Number(rate).toFixed(2)}`}</strong><span>per kg</span></div></div>
  </section>;
}
