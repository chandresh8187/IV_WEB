import { useCallback, useEffect, useRef, useState } from 'react';
import { Expand, Focus, Hand, Minus, Plus, RotateCcw, Ruler } from 'lucide-react';
import LoadingIndicator from '../../components/LoadingIndicator';
import '../screens/MaterialViewerScreen.css';

export function MaterialCanvas({
  spec, showDimensions, autoRotate, onStopRotation, onToggleDimensions, onToggleRotation,
}) {
  const host = useRef(null);
  const frame = useRef(null);
  const api = useRef(null);
  const [dragMode, setDragMode] = useState('rotate');
  const latestSpec = useRef(spec);
  const displayOptions = useRef({ showDimensions, autoRotate });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const reportError = useCallback(problem => {
    console.error('Material preview error:', problem);
    setError(typeof problem === 'string'
      ? problem
      : 'Could not display the 3D preview. Retry the preview.');
    setLoading(false);
  }, []);

  useEffect(() => {
    latestSpec.current = spec;
    try {
      api.current?.update(spec);
    } catch (problem) {
      reportError(problem);
    }
  }, [spec, reportError]);

  useEffect(() => {
    displayOptions.current = { showDimensions, autoRotate, dragMode };
    try {
      api.current?.display(displayOptions.current);
    } catch (problem) {
      reportError(problem);
    }
  }, [showDimensions, autoRotate, dragMode, reportError]);

  useEffect(() => {
    let cancelled = false;
    let viewer;
    setLoading(true);
    setError('');
    // Keep renderer loading failures inside the preview so job details stay usable.
    import('./materialViewerScene')
      .then(({ mountMaterialViewer }) => {
        if (cancelled) return;
        viewer = mountMaterialViewer(host.current, latestSpec.current, reportError);
        api.current = viewer;
        viewer.display(displayOptions.current);
        setLoading(false);
      })
      .catch(problem => {
        if (!cancelled) reportError(problem);
      });
    return () => {
      cancelled = true;
      if (api.current === viewer) api.current = null;
      viewer?.dispose();
    };
  }, [attempt, reportError]);

  const run = operation => {
    try {
      operation(api.current);
    } catch (problem) {
      reportError(problem);
    }
  };
  const view = key => {
    onStopRotation();
    run(viewer => viewer?.setView(key));
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current.requestFullscreen();
    } catch {
      setError('Your browser could not open full screen. Retry the preview.');
    }
  };
  return (
    <section className="mv-viewer" ref={frame} aria-label="Material preview" aria-busy={loading}>
      <div className="mv-viewer-top">
        <div><span className="eyebrow">3D WORKSPACE</span><strong>{spec.profileLabel}</strong></div>
        <span className="mv-unit-badge">{['w_beam', 'gl_hat_purlin'].includes(spec.profile) ? 'Schematic profile · mm' : '1:1 geometry · mm'}</span>
      </div>
      <div className="mv-views" role="group" aria-label="Workspace controls">
        {[['iso', 'Isometric'], ['top', 'Top'], ['side', 'Side'], ['end', 'End section']].map(([key, label]) => (
          <button type="button" key={key} onClick={() => view(key)}>{label}</button>
        ))}
        <button type="button" className="mv-toggle-button" aria-pressed={showDimensions} onClick={onToggleDimensions}><Ruler size={14} /> Show dimensions (mm)</button>
        <button type="button" className="mv-toggle-button" aria-pressed={autoRotate} onClick={onToggleRotation}><RotateCcw size={14} /> Auto rotate</button>
      </div>
      <div className="mv-stage">
        <div className="mv-canvas-host" ref={host} onPointerDown={onStopRotation} onWheel={onStopRotation} />
        {loading && <div className="mv-render-error" role="status"><LoadingIndicator label="Loading 3D preview…" /></div>}
        {error && <div className="mv-render-error" role="alert"><strong>{error}</strong><button type="button" className="outline-button" onClick={() => setAttempt(value => value + 1)}>Retry preview</button></div>}
        <div className="mv-axis-note">Z · length<br />X / Y · section</div>
      </div>
      <div className="mv-viewer-controls" role="group" aria-label="3D viewer controls">
        <button type="button" aria-pressed={dragMode === 'rotate'} onClick={() => { onStopRotation(); setDragMode('rotate'); }}><RotateCcw size={17} /> Rotate</button>
        <button type="button" aria-pressed={dragMode === 'pan'} onClick={() => { onStopRotation(); setDragMode('pan'); }}><Hand size={17} /> Hand / Pan</button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => run(viewer => viewer?.zoom(0.75))}><Plus size={18} /></button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => run(viewer => viewer?.zoom(1.33))}><Minus size={18} /></button>
        <button type="button" onClick={() => view('iso')}><Focus size={17} /> Fit / reset</button>
        <button type="button" onClick={fullscreen} title="Full screen"><Expand size={17} /><span>Full screen</span></button>
      </div>
      <p className="mv-interaction-help">{dragMode === 'pan' ? 'Drag or move one finger to pan' : 'Drag or move one finger to rotate'} · Scroll or pinch to zoom · Right-drag or two fingers to pan</p>
    </section>
  );
}

export default function TemplatePreview({ spec }) {
  const [showDimensions, setShowDimensions] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  return (
    <div className="job-template-preview">
      <MaterialCanvas
        spec={spec}
        showDimensions={showDimensions}
        autoRotate={autoRotate}
        onStopRotation={() => setAutoRotate(false)}
        onToggleDimensions={() => setShowDimensions(value => !value)}
        onToggleRotation={() => setAutoRotate(value => !value)}
      />
    </div>
  );
}
