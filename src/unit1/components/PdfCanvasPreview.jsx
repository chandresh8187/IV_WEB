import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl
export default function PdfCanvasPreview({ blob }) {
  const container = useRef(null), canvas = useRef(null)
  const [document, setDocument] = useState(null), [page, setPage] = useState(1)
  const [width, setWidth] = useState(800), [zoom, setZoom] = useState(1), [error, setError] = useState('')
  useEffect(() => {
    let active = true, task
    ;(async () => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (!active) return
      task = getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false })
      const loaded = await task.promise
      if (active) setDocument(loaded)
    })().catch(err => { if (active) setError(err.message || 'Could not load PDF preview.') })
    return () => { active = false; task?.destroy().catch(() => {}) }
  }, [blob])
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, entries[0].contentRect.width - 24)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!document) return
    let active = true, rendering
    ;(async () => {
      const pdfPage = await document.getPage(page)
      if (!active || !canvas.current) return
      const base = pdfPage.getViewport({ scale: 1 }), ratio = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = pdfPage.getViewport({ scale: width * zoom / base.width })
      const node = canvas.current
      node.width = Math.ceil(viewport.width * ratio); node.height = Math.ceil(viewport.height * ratio)
      node.style.width = `${viewport.width}px`; node.style.height = `${viewport.height}px`
      rendering = pdfPage.render({ canvasContext: node.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] })
      await rendering.promise
    })().catch(err => { if (active && err.name !== 'RenderingCancelledException') setError(err.message || 'Could not render PDF page.') })
    return () => { active = false; rendering?.cancel() }
  }, [document, page, width, zoom])
  return <div className="unit1-pdf-canvas-view" ref={container}>
    <div className="unit1-pdf-controls"><button className="outline-button" type="button" disabled={!document || page === 1} onClick={() => setPage(page - 1)}>Previous</button><span aria-live="polite">{document ? `Page ${page} of ${document.numPages}` : 'Loading PDF…'}</span><button className="outline-button" type="button" disabled={!document || page === document.numPages} onClick={() => setPage(page + 1)}>Next</button><label>Zoom<select value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[.5, .75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select></label></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="unit1-pdf-canvas-scroll" role="region" aria-label="PDF report preview" tabIndex={0}><canvas ref={canvas} aria-label={`PDF page ${page}`} /></div>
  </div>
}
