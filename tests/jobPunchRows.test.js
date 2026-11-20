import test from 'node:test'
import assert from 'node:assert/strict'
import { jobPunchRows } from '../src/unit1/utils/jobPunchRows.js'
test('job details group dimensions and keep one punch letter per size across profiles', () => {
 const holes=[{punchSize:'18X20',profile:'l_flange',targetMm:60},{punchSize:'22X50',profile:'web',targetMm:160},{punchSize:'20X20',profile:'web',targetMm:366},{punchSize:'22X50',profile:'web',targetMm:500},{punchSize:'18X20',profile:'r_flange',targetMm:0}]
 const rows=jobPunchRows({holes})
 assert.deepEqual(rows.map(row=>row.punch),['A','B','C','A'])
 assert.equal(rows[1].dimensions,'160-500')
 assert.equal(rows[3].dimensions,'0')
 assert.equal(holes.length,5)
})
test('legacy punch size and empty jobs are supported', () => {
 assert.deepEqual(jobPunchRows({}),[])
 assert.equal(jobPunchRows({punchSize:'12X20',holes:[{profile:'web',targetMm:10}]})[0].punchSize,'12X20')
})
