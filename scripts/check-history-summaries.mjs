import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {MaterialSummary,PlanningSummary}=await server.ssrLoadModule('/src/screens/history/HistoryScreen.jsx');
 const material={item_id:9,material_name:'MS BEAM',material_descriptions:'4mm structural beam',total_production_qty:30};
 const markup=renderToStaticMarkup(React.createElement(MaterialSummary,{materials:[material],search:'BEAM',onReport:()=>{}}));
 assert.match(markup,/MS BEAM/);assert.match(markup,/30 NOS/);assert.match(markup,/PDF Report/);assert.match(markup,/<footer[^>]*history-card-actions/);
 const description=renderToStaticMarkup(React.createElement(MaterialSummary,{materials:[material],search:'4mm',onReport:null}));
 assert.match(description,/MS BEAM/);assert.doesNotMatch(description,/PDF Report/);
 const plan=renderToStaticMarkup(React.createElement(PlanningSummary,{planning:[{planning_id:100,planning_item_id:1,challan_no:'DC/123',planned_qty:100,completed_qty:50}],search:'',onReport:()=>{},downloadingKey:'planning:1'}));
 assert.match(plan,/50%/);assert.match(plan,/Generating/);assert.match(plan,/disabled/);assert.match(plan,/<footer[^>]*history-card-actions/);
 console.log('History material/planning rendering, search, quantities, progress, permissions and PDF footers passed.');
} finally {await server.close();}
