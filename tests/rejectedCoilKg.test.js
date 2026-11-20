import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectedCoilKg } from '../src/unit1/utils/rejectedCoilKg.js';

const run = {widthMm:298,thicknessMm:2,densityGcm3:7.85,cutBladeSizeMm:5};
const lines = [{cutLengthMm:2100,pieces:2},{cutLengthMm:2400,pieces:2},{cutLengthMm:2200,pieces:1}];
test('preview uses actual rejected lengths and includes one cut blade offcut per piece',()=>{
  assert.equal(rejectedCoilKg(run,{coilThicknessMm:2},lines),52.5173);
  assert.equal(rejectedCoilKg(run,{coilThicknessMm:2},[lines[0],lines[2]]),30.0132);
  assert.equal(rejectedCoilKg({...run,cutBladeSizeMm:0},{},lines),52.4003);
});
test('preview follows the matched allowed coil thickness instead of the first allowed size',()=>{
  const job = {coilThicknessMm:3,allowedCoilSizes:JSON.stringify([{widthMm:254,thicknessMm:3},{widthMm:298,thicknessMm:2}])};
  assert.equal(rejectedCoilKg(run,job,lines),52.5173);
  assert.equal(rejectedCoilKg(run,{coilThicknessMm:3},lines),52.5758);
});
test('empty lists show zero and incomplete or invalid inputs do not invent a weight',()=>{
  assert.equal(rejectedCoilKg({},null,[]),0);
  assert.equal(rejectedCoilKg({},null,lines),null);
  assert.equal(rejectedCoilKg(run,{},lines),null);
  assert.equal(rejectedCoilKg({...run,cutBladeSizeMm:-1},{coilThicknessMm:2},lines),null);
  assert.equal(rejectedCoilKg(run,{coilThicknessMm:2},[{cutLengthMm:0,pieces:1}]),null);
});
