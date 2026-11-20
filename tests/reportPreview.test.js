import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { inspectionNavigation } from '../src/unit1/utils/inspectionNavigation.js'

test('report preview returns to its originating history or job card screen', () => {
  assert.equal(inspectionNavigation('/production/reports/preview', {returnTo:'/production/history'}).backTo, '/production/history')
  assert.equal(inspectionNavigation('/production/reports/preview', {returnTo:'/production/job-cards'}).backTo, '/production/job-cards')
  assert.equal(inspectionNavigation('/production/reports/preview', {returnTo:'https://example.com'}).backTo, '/production/history')
})

function printer(fail = false) {
  const calls = { rendered: [], images: [], printed: false, removed: false, destroyed: false }
  const frame = { style: {}, remove: () => { calls.removed = true }, contentDocument: {
    createElement: tag => ({ tag, decode: async () => {} }), head: {append() {}}, body: {append: image => calls.images.push(image)},
  }, contentWindow: {addEventListener() {},focus() {},print: () => { assert.equal(calls.images.length, 2); assert.equal(calls.rendered.length, 2); calls.printed = true }} }
  const document = {body:{append() {}},createElement: tag => tag === 'iframe' ? frame : {getContext:()=>({}),toDataURL:()=> 'data:image/png;base64,example'}}
  const getDocument = () => ({destroy:async()=>{calls.destroyed=true},promise: Promise.resolve({numPages:2,getPage:async number=>({getViewport:()=>({width:595,height:842}),render:()=>({promise:fail ? Promise.reject(Error('Render failed')) : Promise.resolve().then(()=>calls.rendered.push(number))}),cleanup(){}})})})
  const source = fs.readFileSync(new URL('../src/unit1/utils/printPdf.js', import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace('GlobalWorkerOptions.workerSrc = workerUrl','').replace('export async function','async function')
  const context = {document,getDocument,Uint8Array}; vm.createContext(context); vm.runInContext(source,context)
  return {calls,print:()=>context.printPdf({arrayBuffer:async()=>new ArrayBuffer(4)})}
}

test('job card print waits for every page and releases the PDF worker', async () => {
  const fixture=printer(); await fixture.print()
  assert.equal(fixture.calls.printed,true)
  assert.equal(fixture.calls.destroyed,true)
})
test('failed rendering removes the print frame and never opens print', async () => {
  const fixture=printer(true); await assert.rejects(fixture.print(), /Render failed/)
  assert.equal(fixture.calls.printed,false)
  assert.equal(fixture.calls.removed,true)
  assert.equal(fixture.calls.destroyed,true)
})
