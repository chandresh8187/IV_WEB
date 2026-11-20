import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectionNavigation } from '../src/unit1/utils/inspectionNavigation.js'
test('inspection header returns to the immediate parent screen', () => {
  assert.deepEqual(inspectionNavigation('/production/live/6/hole-checks/preview'), {title:'PDF preview',backTo:'/production/live/6/hole-checks'})
  assert.deepEqual(inspectionNavigation('/production/live/6/hole-checks'), {title:'Hole checks',backTo:'/production/live'})
  assert.equal(inspectionNavigation('/production/live/6/entries'), null)
  assert.equal(inspectionNavigation('/production/live'), null)
})
