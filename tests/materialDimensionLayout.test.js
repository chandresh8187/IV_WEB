import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensionOutline,layoutDimensionLabels} from '../src/unit1/components/materialDimensionLayout.js';

function verify(result,width,height){
 const visible=result.filter(item=>item.visible);
 for(const rect of visible){
  assert.ok(rect.left>=8&&rect.top>=8);
  assert.ok(rect.left+rect.width<=width-8+.0001&&rect.top+rect.height<=height-8+.0001);
 }
 for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
  const a=visible[i],b=visible[j];
  assert.ok(a.left+a.width+5.99<=b.left||b.left+b.width+5.99<=a.left||a.top+a.height+5.99<=b.top||b.top+b.height+5.99<=a.top,'dimension badges must not overlap');
 }
}
test('more than ten holes and their centre distances fit separate readable labels',()=>{
 const items=Array.from({length:29},(_,index)=>({id:index,x:180+index*12,y:200+index*2,width:160,height:24,priority:index<5?0:index%2?1:2}));
 const result=layoutDimensionLabels(items,1000,520);
 assert.equal(result.filter(item=>item.visible).length,items.length);
 verify(result,1000,520);assert.deepEqual(result.map(item=>item.id),items.map(item=>item.id));
});
test('crowded mobile views keep fitting labels apart without losing input identities',()=>{
 const items=Array.from({length:120},(_,index)=>({id:index,x:200,y:140,width:180,height:28,priority:index<4?0:1}));
 const result=layoutDimensionLabels(items,360,300);
 assert.equal(result.length,items.length);
 assert.ok(result.some(item=>!item.visible));assert.ok(result.slice(0,4).every(item=>item.visible));
 verify(result,360,300);
 assert.deepEqual(layoutDimensionLabels(items,360,300),result);
});

test('Top view puts dimension badges to the left and right of the material',()=>{
 const outline=dimensionOutline([{x:450,y:60},{x:550,y:60},{x:550,y:460},{x:450,y:460}]);
 const items=Array.from({length:20},(_,index)=>({id:index,x:500,y:80+index*18,width:150,height:24}));
 const result=layoutDimensionLabels(items,1000,520,{outline,placement:'left-right'}).filter(item=>item.visible);
 assert.equal(result.length,items.length);verify(result,1000,520);
 assert.ok(result.every(item=>item.left+item.width<=438||item.left>=562));
 assert.ok(result.some(item=>item.left<450)&&result.some(item=>item.left>550));
});

test('Side view keeps all badges above and below the projected material',()=>{
 const outline=dimensionOutline([{x:90,y:240},{x:910,y:240},{x:910,y:280},{x:90,y:280}]);
 const items=Array.from({length:20},(_,index)=>({id:index,x:100+index*40,y:250,width:130,height:24}));
 const result=layoutDimensionLabels(items,1000,520,{outline,placement:'above-below'}).filter(item=>item.visible);
 assert.equal(result.length,items.length);verify(result,1000,520);
 assert.ok(result.every(item=>item.top+item.height<=228||item.top>=292));
 assert.ok(result.some(item=>item.top<240)&&result.some(item=>item.top>280));
});

test('isometric layout uses the projected outline rather than blocking its entire bounding rectangle',()=>{
 const outline=dimensionOutline([{x:100,y:400},{x:150,y:440},{x:880,y:120},{x:830,y:80},{x:100,y:400}]);
 assert.equal(outline.length,4);
 const [label]=layoutDimensionLabels([{id:1,x:500,y:430,width:150,height:24}],1000,520,{outline});
 assert.equal(label.visible,true);
 assert.equal(label.top,418);
});

test('hole-size callouts use a longer outer lane beyond the hole-to-hole labels',()=>{
 for(const placement of ['left-right','above-below']){
  const outline=placement==='left-right'
   ? dimensionOutline([{x:450,y:60},{x:550,y:60},{x:550,y:460},{x:450,y:460}])
   : dimensionOutline([{x:90,y:240},{x:910,y:240},{x:910,y:280},{x:90,y:280}]);
  const items=Array.from({length:12},(_,index)=>({id:'gap'+index,x:placement==='left-right'?500:100+index*65,y:placement==='left-right'?70+index*32:250,width:140,height:24,priority:1}));
  const outset=placement==='left-right'?158:42;
  const sizes=items.map((item,index)=>({...item,id:'size'+index,width:90,priority:2,outset}));
  const result=layoutDimensionLabels([...items,...sizes],1000,520,{outline,placement});
  assert.ok(result.every(item=>item.visible));verify(result,1000,520);
  for(const item of result.filter(item=>item.id.startsWith('size'))){
   if(placement==='left-right')assert.ok(item.left+item.width<=280||item.left>=720);
   else assert.ok(item.top+item.height<=186||item.top>=334);
  }
 }
});
test('zoomed, panned and resized anchors stay within the viewport without changing measurements',()=>{
 const items=[{id:'a',x:-50,y:10,width:150,height:24},{id:'b',x:1200,y:1200,width:150,height:24},{id:'c',x:100,y:100,width:150,height:24}];
 const original=JSON.stringify(items);
 for(const [width,height] of [[360,300],[1200,600]])verify(layoutDimensionLabels(items,width,height),width,height);
 assert.equal(JSON.stringify(items),original);
 assert.ok(layoutDimensionLabels(items,0,0).every(item=>!item.visible));
});
