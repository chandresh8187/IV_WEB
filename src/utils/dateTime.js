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
  const parsed = moment(value, ['HH:mm:ss', 'HH:mm', 'h:mm A', moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format('hh:mm A') : fallback;
};

export const formatDisplayDateTime = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = moment(value, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY, hh:mm A') : fallback;
};