import './LoadingIndicator.css';

export default function LoadingIndicator({ label = 'Loading…', inline = false, fullPage = false, className = '' }) {
  return <span className={['iv-loading', inline ? 'iv-loading-inline' : 'iv-loading-block', fullPage && 'iv-loading-page', className].filter(Boolean).join(' ')} role="status" aria-live="polite" aria-atomic="true">
    <span className="iv-loading-spinner" aria-hidden="true" />
    <span className="iv-loading-label">{label}</span>
  </span>;
}
