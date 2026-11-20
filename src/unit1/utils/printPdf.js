import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = workerUrl
let previousFrame
export async function printPdf(blob) {
  previousFrame?.remove()
  const frame = document.createElement('iframe')
  frame.title = 'Print job card'
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0'
  document.body.append(frame)
  previousFrame = frame
  let task
  try {
    task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true, isEvalSupported: false })
    const pdf = await task.promise
    const printDocument = frame.contentDocument
    const style = printDocument.createElement('style')
    const first = await pdf.getPage(1), size = first.getViewport({ scale: 1 })
    style.textContent = `@page{size:${size.width}pt ${size.height}pt;margin:0}html,body{margin:0;padding:0}img{display:block;width:100%;break-after:page}img:last-child{break-after:auto}`
    printDocument.head.append(style)
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const image = printDocument.createElement('img')
      image.src = canvas.toDataURL('image/png')
      printDocument.body.append(image)
      await image.decode()
      canvas.width = 0; canvas.height = 0
      page.cleanup()
    }
    frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true })
    frame.contentWindow.focus()
    frame.contentWindow.print()
  } catch (error) { frame.remove(); throw error }
  finally { await task?.destroy() }
}
