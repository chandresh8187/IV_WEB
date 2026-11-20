import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {screenNavigation} from '../src/unit1/utils/screenNavigation.js';
test('every static screen has a title and an explicit parent',()=>{
 const source=fs.readFileSync(new URL('../src/unit1/App.jsx',import.meta.url),'utf8');
 const shell=source.slice(0,source.indexOf('export default function App()'));
 const routes=[...shell.matchAll(/<Route\s+path="([^":*]+)"/g)].map(m=>'/'+m[1]);
 for(const route of routes){const nav=screenNavigation(route);assert.notEqual(nav.title,'Page not found',route);assert.ok(nav.backTo,route);assert.equal(screenNavigation(route+'/').title,nav.title);}
 assert.deepEqual(screenNavigation('/'),{title:'Dashboard',backTo:null});
});
test('nested screens return to their actual parent without browser-history dependence',()=>{
 for(const [path,parent] of [['/production/assign-coil','/production/live'],['/production/live/2/entries','/production/live'],['/production/live/2/hole-checks','/production/live'],['/production/live/2/hole-checks/preview','/production/live/2/hole-checks']])assert.equal(screenNavigation(path).backTo,parent,path);
});
test('PDF previews preserve the report origin and reject external return paths',()=>{
 assert.equal(screenNavigation('/production/reports/preview',{returnTo:'/production/job-cards'}).backTo,'/production/job-cards');
 assert.equal(screenNavigation('/production/reports/preview',{returnTo:'https://example.com'}).backTo,'/production/history');
});

test('Unit 1 Profile has a title and a stable dashboard parent',()=>{assert.deepEqual(screenNavigation('/profile'),{title:'Profile',backTo:'/'});});

test('retired coil stock and QR pages cannot reopen through navigation',()=>{for(const path of ['/coils/inwards','/coils/qr-generator','/coils/5/qr','/scan/coil/123456/1'])assert.equal(screenNavigation(path).title,'Page not found');});
