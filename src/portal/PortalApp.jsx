import LoadingIndicator from "../components/LoadingIndicator";
import { lazy, Suspense, useEffect } from 'react';
import { savedWorkspace } from './unitSession';
import UnitLoginScreen from './UnitLoginScreen';
const Unit1Workspace = lazy(() => import('./Unit1Workspace'));
const Unit2Workspace = lazy(() => import('./Unit2Workspace'));
export default function PortalApp({ unit }) {
  const saved = !unit ? savedWorkspace(localStorage) : null;
  useEffect(() => {
    if (saved) window.location.replace('/' + saved + '/');
  }, [saved]);
  if (saved) return <LoadingIndicator label="Opening workspace…" fullPage />;
  return <Suspense fallback={<LoadingIndicator label="Opening workspace…" fullPage />}>
    {unit === 'unit1' ? <Unit1Workspace /> : unit === 'unit2' ? <Unit2Workspace /> : <UnitLoginScreen />}
  </Suspense>;
}
