import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext, runInContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {rehearsalHeaders, rehearsalRow, fixtureUuid} from './helpers/outreach-rehearsal-fixture.js';

const root = new URL('../integrations/google-apps-script/', import.meta.url);
const identity = await readFile(new URL('outreach-identity.gs', root), 'utf8');
const source = await readFile(new URL('migration-tools/outreach-id-production.gs', root), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const clean = () => [[...rehearsalHeaders], rehearsalRow('Existing', {activity_id:fixtureUuid(1)}), rehearsalRow('New A'), rehearsalRow('New B')];

function harness(options = {}) {
  const state = {grid:copy(options.grid || clean()), writes:[], logs:[], reads:0, locks:0, generations:0, now:1_800_000_000_000};
  const props = new Map();
  const matrix = value => state.grid.map(row => row.map(() => value));
  const protection = {
    getRange:() => ({getColumn:()=>21,getNumColumns:()=>1,getRow:()=>1,getNumRows:()=>1000}),
    isWarningOnly:()=>Boolean(options.warningOnly), canEdit:()=>!options.cannotEdit,
    canDomainEdit:()=>Boolean(options.domainEdit),
    getEditors:()=>options.extraEditor ? [{getEmail:()=>'editor@example.test'}] : [],
  };
  const sheet = {
    getSheetId:()=>65444517, getLastRow:()=>state.grid.length, getLastColumn:()=>state.grid[0].length, getMaxRows:()=>1000,
    getProtections:()=>options.unprotected?[]:[protection],
    getDataRange:()=>({
      getDisplayValues() { state.reads++; if(options.onRead) options.onRead(state); return copy(state.grid); },
      getValues:()=>copy(state.grid), getFormulas:()=>state.grid.map(row=>row.map(v=>typeof v==='string'&&v.startsWith('=')?v:'')),
      getNotes:()=>matrix('fixture note'),getNumberFormats:()=>matrix('@'),getBackgrounds:()=>matrix('#ffffff'),
      getFontColors:()=>matrix('#000000'),getFontWeights:()=>matrix('normal'),getFontSizes:()=>matrix(11),
      getHorizontalAlignments:()=>matrix('left'),getVerticalAlignments:()=>matrix('bottom'),getDataValidations:()=>matrix(null),
    }),
    getRange:(r,c)=>({getValue:()=>state.grid[r-1][c-1],getFormula:()=>'',setValue(value) {
      if(options.failAfter===state.writes.length) throw new Error('private raw failure');
      assert.equal(c,21); assert.ok(r>1); assert.equal(state.grid[r-1][c-1],'');
      state.writes.push({r,c,value});state.grid[r-1][c-1]=value;
      if(options.onWrite) options.onWrite(state);
    }}),
  };
  const vm = createContext({
    Date:{now:()=>state.now}, Number, console:{log:v=>state.logs.push(v)},
    Session:{getEffectiveUser:()=>({getEmail:()=>options.notOwner?'editor@example.test':'owner@example.test'})},
    SpreadsheetApp:{ProtectionType:{RANGE:'RANGE'},getActiveSpreadsheet:()=>({
      getId:()=>options.wrongTarget?'disposable-fixture':'1Sh2_8DwOKiROgIo8H9WDH3nVMBa-eZctEijB8MhV0BQ',
      getOwner:()=>({getEmail:()=>'owner@example.test'}),getSheetByName:()=>sheet,
    }),flush(){}},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(options.lockDenied)return false;state.locks++;return true;},releaseLock:()=>state.locks--})},
    Utilities:{getUuid:()=>fixtureUuid(100+state.generations++),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,v)=>[...createHash('sha256').update(v).digest()],base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')},
  });
  // Never modify the real file or contact Google: exercise post-approval logic in a VM only.
  runInContext(identity + source.replace('const PRODUCTION_OUTREACH_WRITES_APPROVED_ = false;',
    `const PRODUCTION_OUTREACH_WRITES_APPROVED_ = ${Boolean(options.unlocked)};`),vm);
  const approve = () => {const plan=vm.dryRunProductionOutreachIds();props.set('OUTREACH_PRODUCTION_APPROVED_SNAPSHOT',plan.snapshot);props.set('OUTREACH_PRODUCTION_WRITE_CONFIRM','ASSIGN_BLANK_IDS_ONLY');return plan;};
  return {vm,state,props,approve};
}

test('production artifact is hard write-locked before any target read and has no deployment or trigger entrypoint',()=>{
  assert.match(source,/const PRODUCTION_OUTREACH_WRITES_APPROVED_ = false;/);
  assert.doesNotMatch(source,/function (doGet|doPost|onEdit|onOpen)\b|UrlFetchApp|openById|setValues\(|appendRow\(/);
  const {vm,state}=harness();
  assert.throws(()=>vm.backfillProductionOutreachIds(),/release_locked/);
  assert.throws(()=>vm.assignNewProductionOutreachIds(),/release_locked/);
  assert.equal(state.reads,0);assert.equal(state.writes.length,0);
});

test('target, owner, strict header and owner-only protection gates fail closed',()=>{
  for(const option of [{wrongTarget:true},{notOwner:true},{unprotected:true},{warningOnly:true},{cannotEdit:true},{domainEdit:true},{extraEditor:true}]) {
    const {vm,state}=harness({...option,unlocked:true});
    assert.throws(()=>vm.dryRunProductionOutreachIds());assert.throws(()=>vm.backfillProductionOutreachIds());assert.equal(state.writes.length,0);
  }
  for(const col of [1,9,20]) {
    const grid=clean();grid[0][col]='Ambiguous or changed header';
    assert.throws(()=>harness({grid}).vm.dryRunProductionOutreachIds(),/headers_refused/);
  }
});

test('dry-run generates no UUIDs/writes; explicitly approved assignment preserves all business fields and IDs',()=>{
  const {vm,state,props,approve}=harness({unlocked:true});const before=copy(state.grid);
  assert.equal(approve().audit.rowsNeedingIds,2);assert.equal(state.generations,0);assert.equal(state.writes.length,0);
  assert.equal(vm.backfillProductionOutreachIds().assigned,2);
  assert.deepEqual(state.grid.map(r=>r.slice(0,20)),before.map(r=>r.slice(0,20)));
  assert.equal(state.grid[1][20],fixtureUuid(1));assert.notEqual(state.grid[2][20],state.grid[3][20]);
  assert.equal(vm.backfillProductionOutreachIds().assigned,0);assert.equal(state.generations,2);
  assert.equal(props.has('OUTREACH_PRODUCTION_WRITE_CONFIRM'),false);assert.equal(state.locks,0);
});

test('duplicate, malformed and ID-formula states never produce a write',()=>{
  for(const invalid of [fixtureUuid(1),'not-a-uuid','=UUID()']) {
    const grid=clean();grid[2][20]=invalid;
    const {vm,state}=harness({unlocked:true,grid});
    if(invalid.startsWith('=')) assert.throws(()=>vm.dryRunProductionOutreachIds(),/identity_invalid/);
    else {const plan=vm.dryRunProductionOutreachIds();assert.equal(plan.blocked,true);assert.equal(plan.snapshot,null);}
    assert.throws(()=>vm.backfillProductionOutreachIds());assert.equal(state.writes.length,0);assert.equal(state.generations,0);
  }
});

test('already identified sheets require reviewed initialization before subsequent new-row assignment',()=>{
  const grid=clean();grid[2][20]=fixtureUuid(2);grid[3][20]=fixtureUuid(3);
  const h=harness({unlocked:true,grid});
  assert.throws(()=>h.vm.backfillProductionOutreachIds());
  h.approve();assert.equal(h.vm.backfillProductionOutreachIds().assigned,0);
  assert.equal(h.props.get('OUTREACH_PRODUCTION_INITIALIZED'),'true');
  assert.equal(h.state.generations,0);assert.equal(h.state.writes.length,0);
  h.state.grid.push(rehearsalRow('Genuinely new'));h.approve();
  h.props.set('OUTREACH_PRODUCTION_NEW_ROWS','[5]');
  assert.equal(h.vm.assignNewProductionOutreachIds().assigned,1);
});

test('unapproved, stale, future and changed plans cannot write; expired confirmation cannot be reused',()=>{
  for(const mutate of [({props})=>props.delete('OUTREACH_PRODUCTION_APPROVED_SNAPSHOT'),({state})=>state.now+=900001,
    ({state})=>state.now-=1,({state})=>state.grid[1][1]='Edited',({vm})=>vm.dryRunProductionOutreachIds()]) {
    const h=harness({unlocked:true});h.approve();mutate(h);assert.throws(()=>h.vm.backfillProductionOutreachIds());assert.equal(h.state.writes.length,0);
  }
  const h=harness({unlocked:true,onRead:s=>{if(s.reads===3)s.grid[1][1]='Changed during planning';}});
  h.approve();assert.throws(()=>h.vm.backfillProductionOutreachIds());assert.equal(h.state.writes.length,0);
});

test('partial writes remain stable, require fresh review and resume without regeneration; logs exclude private values',()=>{
  const options={unlocked:true,failAfter:1};const h=harness(options);h.approve();
  assert.throws(()=>h.vm.backfillProductionOutreachIds());const assigned=h.state.grid[2][20];
  assert.equal(h.props.has('OUTREACH_PRODUCTION_WRITE_CONFIRM'),false);assert.equal(h.state.locks,0);
  options.failAfter=undefined;h.approve();assert.equal(h.vm.backfillProductionOutreachIds().assigned,1);
  assert.equal(h.state.grid[2][20],assigned);assert.doesNotMatch(h.state.logs.join(''),/PRIVATE|example.test|raw failure|00000000-/);
});

test('copied rows block; later blanks require explicit new-record mode and exact row authorization',()=>{
  const h=harness({unlocked:true});h.approve();h.vm.backfillProductionOutreachIds();
  h.state.grid.push(copy(h.state.grid[1]));assert.equal(h.vm.dryRunProductionOutreachIds().blocked,true);
  assert.throws(()=>h.vm.assignNewProductionOutreachIds());
  h.state.grid[4][20]='';h.approve();assert.throws(()=>h.vm.backfillProductionOutreachIds());assert.throws(()=>h.vm.assignNewProductionOutreachIds());
  h.props.set('OUTREACH_PRODUCTION_NEW_ROWS','[5]');assert.equal(h.vm.assignNewProductionOutreachIds().assigned,1);
  assert.notEqual(h.state.grid[4][20],h.state.grid[1][20]);assert.equal(h.vm.assignNewProductionOutreachIds().assigned,0);
});

test('lock contention and concurrent business changes stop without destructive rollback',()=>{
  const locked=harness({unlocked:true,lockDenied:true});locked.approve();assert.throws(()=>locked.vm.backfillProductionOutreachIds(),/lock_unavailable/);assert.equal(locked.state.writes.length,0);
  const h=harness({unlocked:true,onWrite:s=>{s.grid[1][1]='Concurrent edit';}});h.approve();
  assert.throws(()=>h.vm.backfillProductionOutreachIds());assert.equal(h.state.grid[1][1],'Concurrent edit');assert.equal(h.state.writes.length,2);
  assert.equal(h.props.has('OUTREACH_PRODUCTION_INITIALIZED'),false);
});
