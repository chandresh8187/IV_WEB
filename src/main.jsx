import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import PortalApp from './portal/PortalApp';
import { workspaceUnit } from './portal/unitSession';
import '@fontsource-variable/inter/wght.css';

const unit = workspaceUnit(window.location.pathname);
// Preserve old Unit 2 bookmarks when opening the merged application.
if (!unit && !['/', '/login', '/login/'].includes(window.location.pathname)) {
  window.location.replace('/unit2' + window.location.pathname + window.location.search + window.location.hash);
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode><BrowserRouter basename={unit ? '/' + unit : '/'}><RouteErrorBoundary>
      <PortalApp unit={unit} />
    </RouteErrorBoundary></BrowserRouter></StrictMode>,
  );
}
