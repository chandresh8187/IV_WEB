import './GasDateTimePicker.css';

const pad = value => String(value).padStart(2, '0');

export default function GasDateTimePicker({ label, value, onChange }) {
  const [date = '', clock = '12:00'] = String(value || '').split('T');
  const [hourText = '12', minuteText = '00'] = clock.split(':');
  const hour24 = Number(hourText);
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const update = (nextDate, nextHour, nextMinute, nextPeriod) => {
    const next24 = Number(nextHour) % 12 + (nextPeriod === 'PM' ? 12 : 0);
    onChange(`${nextDate}T${pad(next24)}:${pad(nextMinute)}`);
  };

  return <div className="gas-date-time-control" role="group" aria-label={label}>
    <span className="gas-date-time-label">{label}</span>
    <div className="gas-date-time-fields">
      <input type="date" aria-label={`${label} date`} required value={date} onChange={event => update(event.target.value, hour12, minuteText, period)} />
      <select aria-label={`${label} hour`} value={hour12} onChange={event => update(date, event.target.value, minuteText, period)}>
        {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{pad(index + 1)}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label={`${label} minute`} value={Number(minuteText)} onChange={event => update(date, hour12, event.target.value, period)}>
        {Array.from({ length: 60 }, (_, index) => <option key={index} value={index}>{pad(index)}</option>)}
      </select>
      <select className="gas-period-select" aria-label={`${label} AM or PM`} value={period} onChange={event => update(date, hour12, minuteText, event.target.value)}><option value="AM">AM</option><option value="PM">PM</option></select>
    </div>
  </div>;
}
