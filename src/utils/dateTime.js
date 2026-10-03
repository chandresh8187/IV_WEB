import moment from 'moment';

export const formatDisplayDate = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const text = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}(?:[T\s]|$)/.test(text)
    ? moment(text.slice(0, 10), 'YYYY-MM-DD', true)
    : moment(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : fallback;
};

export const formatDisplayTime = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = value instanceof Date || moment.isMoment(value)
    ? moment(value)
    : moment(value, ['HH:mm:ss', 'HH:mm', 'h:mm A', moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format('hh:mm A') : fallback;
};

export const formatDisplayDateTime = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = value instanceof Date || moment.isMoment(value)
    ? moment(value)
    : moment(value, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm', moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY, hh:mm A') : fallback;
};

export const formatPlantDateTimeSeconds = (value, fallback = '—') => {
  if (!value) return fallback;
  const text = String(value).trim();
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const parsed = hasOffset
    ? moment.parseZone(text).utcOffset(330)
    : moment(text, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm'], true);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY, hh:mm:ss A') : fallback;
};

export const formatDisplayMonth = (value, fallback = '—') => {
  if (!value) return fallback;
  const parsed = moment(String(value).slice(0, 7), 'YYYY-MM', true);
  return parsed.isValid() ? parsed.format('MMMM YYYY') : fallback;
};

export const todayInputDate = () => moment().format('YYYY-MM-DD');
export const currentInputMonth = () => moment().format('YYYY-MM');
export const currentPlantInputMonth = () => moment().utcOffset(330).format('YYYY-MM');
export const currentPlantMonthNumber = () => Number(moment().utcOffset(330).format('M'));
export const nowLocalDateTimeInput = () => moment().format('YYYY-MM-DDTHH:mm');
