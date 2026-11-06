import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateAnalysis} from '../lib/contracts.ts';
const run={run_id:'current',input_hash:'hash',items:[{item_id:'my',country:'Malaysia'},{item_id:'cn',country:'China'}]};
const card={source_item_ids:['my'],headline:'中国发展 – original title',summary:['A source says something.'],why_it_matters:{relevance:'Latest context: a new source development needs review.',significance:'A new development needs editorial review.'},priority_band:'Monitor',priority_reason:'Impact; relevance; freshness; novelty.',verification_flags:['Check primary source.']};
const output=()=>({run_id:run.run_id,input_hash:run.input_hash,cards:[structuredClone(card)]});
test('valid analysis preserves Chinese and source IDs',()=>assert.equal(validateAnalysis(output(),run)[0].headline,card.headline));
test('missing source ID rejected',()=>{const v=output();v.cards[0].source_item_ids=['invented'];assert.throws(()=>validateAnalysis(v,run),/known source/);});
test('stale run rejected',()=>{const v=output();v.run_id='old';assert.throws(()=>validateAnalysis(v,run),/Stale import/);});
test('changed source fingerprint rejected',()=>{const v=output();v.input_hash='old';assert.throws(()=>validateAnalysis(v,run),/Stale import/);});
test('unknown priority rejected',()=>{const v=output();v.cards[0].priority_band='Verified';assert.throws(()=>validateAnalysis(v,run),/priority/);});
test('invented model URL field rejected',()=>{const v=output();v.cards[0].url='https://fake.example/';assert.throws(()=>validateAnalysis(v,run),/fields/);});
test('same source cannot appear in two cards',()=>{const v=output();v.cards.push(structuredClone(card));assert.throws(()=>validateAnalysis(v,run),/two cards/);});
test('cross-country grouping rejected',()=>{const v=output();v.cards[0].source_item_ids=['my','cn'];assert.throws(()=>validateAnalysis(v,run),/Cross-country/);});
test('empty shortlist accepted without filler',()=>{const v=output();v.cards=[];assert.equal(validateAnalysis(v,run).length,0);});
test('invalid and oversized output rejected',()=>{for(const v of [null,[],{},'bad',...Array.from({length:1},()=>({...output(),cards:Array(6).fill(card)}))])assert.throws(()=>validateAnalysis(v,run));});
const {ownerCanWrite}=await import('../lib/access.ts');
test('anonymous visitors cannot write',()=>assert.equal(ownerCanWrite(null,'owner@example.test'),false));
test('another signed-in user cannot write',()=>assert.equal(ownerCanWrite('viewer@example.test','owner@example.test'),false));
test('owner can write and comparison ignores email case',()=>assert.equal(ownerCanWrite('Owner@Example.Test','owner@example.test'),true));
test('missing owner configuration fails closed',()=>assert.equal(ownerCanWrite('owner@example.test',undefined),false));

test('summaries must have one to three short bullets',()=>{for(const summary of ['paragraph',[],['a','b','c','d'],['x'.repeat(201)]]){const v=output();v.cards[0].summary=summary;assert.throws(()=>validateAnalysis(v,run),/bullet/);}});
test('new priorities accepted and old priorities rejected',()=>{for(const band of ['Important','Monitor','Good to know']){const v=output();v.cards[0].priority_band=band;assert.equal(validateAnalysis(v,run)[0].priority_band,band);}const v=output();v.cards[0].priority_band='Watch';assert.throws(()=>validateAnalysis(v,run),/priority/);});

test('six stories per country accepted, seven for one country rejected',()=>{const items=Array.from({length:14},(_,i)=>({item_id:'item'+i,country:i<7?'Malaysia':'China'}));const make=ids=>({run_id:'current',input_hash:'hash',cards:ids.map(id=>({...structuredClone(card),source_item_ids:['item'+id]}))});const combined=[0,1,2,3,4,5,7,8,9,10,11,12];assert.equal(validateAnalysis(make(combined),{...run,items}).length,12);assert.throws(()=>validateAnalysis(make([0,1,2,3,4,5,6]),{...run,items}),/six stories per country/);});
