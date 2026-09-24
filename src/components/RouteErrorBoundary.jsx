import { useLocation } from 'react-router';
import ErrorBoundary from './ErrorBoundary';

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}
