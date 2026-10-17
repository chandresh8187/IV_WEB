import LoadingIndicator from "../components/LoadingIndicator";
import { lazy, Suspense } from 'react';
import UnitLoginScreen from './UnitLoginScreen';
const Unit1Workspace = lazy(() => import('./Unit1Workspace'));
const Unit2Workspace = lazy(() => import('./Unit2Workspace'));
export default function PortalApp({ unit }) {
  return <Suspense fallback={<LoadingIndicator label="Opening workspace…" fullPage />}>
    {unit === 'unit1' ? <Unit1Workspace /> : unit === 'unit2' ? <Unit2Workspace /> : <UnitLoginScreen />}
  </Suspense>;
}
