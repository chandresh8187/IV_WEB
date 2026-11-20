import { printPdf } from '../utils/printPdf'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Download, Printer, Share2 } from 'lucide-react'
import './PdfPreviewScreen.css'
import PdfCanvasPreview from '../components/PdfCanvasPreview'

export function PreviewDocument({ blob, filename, reportTitle = 'QA/QC report', printable }) {
  const [url, setUrl] = useState(null)
  const [printing, setPrinting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  // Each effect owns its URL, including React Strict Mode and development reloads.
  useEffect(() => {
    let active = true
    const current = URL.createObjectURL(blob)
    queueMicrotask(() => { if (active) setUrl(current) })
    return () => { active = false; URL.revokeObjectURL(current) }
  }, [blob])
  const print = async () => {
    setPrinting(true); setMessage('')
    try { await printPdf(blob) } catch (error) { setMessage(error.message || 'Could not print. Download the PDF to print it.') } finally { setPrinting(false) }
  }
  const share = async () => {
    setSharing(true); setMessage('')
    try {
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (!navigator.canShare?.({ files: [file] })) { setMessage('File sharing is unavailable in this browser. Use Download, then share the saved PDF.'); return }
      await navigator.share({ files: [file], title: reportTitle })
    } catch (error) { if (error.name !== 'AbortError') setMessage(error.message || 'Could not share PDF. Use Download to save the file.') }
    finally { setSharing(false) }
  }
  return <section className="unit1-pdf-preview">

    <div className="page-heading"><div><p>{filename}</p></div><div className="live-heading-actions">{printable && <button className="outline-button" type="button" disabled={printing} onClick={print}><Printer size={16} />{printing ? 'Preparing…' : 'Print'}</button>}<button className="outline-button" type="button" onClick={share} disabled={sharing}><Share2 size={16} />{sharing ? 'Sharing…' : 'Share'}</button><a className="primary-button" href={url || undefined} aria-disabled={!url} download={filename}><Download size={16} />Download</a></div></div>
    {message && <div className="notice" role="status">{message}</div>}
    <PdfCanvasPreview blob={blob} />
    <p className="unit1-pdf-help">If the preview does not appear, <a className="text-link" href={url || undefined} target="_blank" rel="noreferrer">open the PDF in a new tab</a> or use Download.</p>
  </section>
}
export default function PdfPreviewScreen() {
  const location = useLocation()
  const { blob, filename = 'report.pdf', reportTitle, printable } = location.state || {}
  if (!(blob instanceof Blob)) return <section><div className="notice">This preview is no longer available. Go back and generate the PDF again.</div></section>
  return <PreviewDocument key={location.key} blob={blob} filename={filename} reportTitle={reportTitle} printable={printable} />
}
