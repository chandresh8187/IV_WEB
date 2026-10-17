export const formatCoilRate = value => value == null || value === '' ? 'Not recorded' : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg`;
