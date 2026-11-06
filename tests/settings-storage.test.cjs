const test = require("node:test");
const assert = require("node:assert/strict");
const { registerHooks } = require("node:module");

// Node 24's native type stripping exercises the actual TS module without installing tooling.
// Narrow extension resolution only; no source rewriting or duplicated implementation.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "../types" && context.parentURL?.endsWith("/features/settings/storage/settingsStorage.ts")) {
    return nextResolve("../types.ts", context);
  }
  return nextResolve(specifier, context);
} });
const { createSettingsStore, parseStoredSettings, SETTINGS_STORAGE_KEY } = require("../features/settings/storage/settingsStorage.ts");
const plain = value => JSON.parse(JSON.stringify(value));
const stored = (patch = {}) => JSON.stringify({ schemaVersion: 1, themeMode: "dark", listeningAutoplay: false, ...patch });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function fixture(raw = null) {
  const values = new Map([[SETTINGS_STORAGE_KEY,raw],["protected-draft","fixture-draft"],["settings:study-time-goal:v1","fixture-goal"]]);
  const calls = [];
  const storage = {
    async getItem(key) { calls.push(["read",key]); return values.get(key) ?? null; },
    async setItem(key,value) { calls.push(["write",key]); values.set(key,value); },
  };
  return {values,calls,storage,store:createSettingsStore(storage)};
}
test("missing storage uses approved defaults without writing them",async()=>{
 const f=fixture(); await f.store.hydrate();
 assert.deepEqual(plain(f.store.getSnapshot().preferences),{schemaVersion:1,themeMode:"system",listeningAutoplay:true});
 assert.deepEqual(f.calls,[["read",SETTINGS_STORAGE_KEY]]);
});
test("restart reads persisted preferences and leaves protected namespaces alone",async()=>{
 const f=fixture(); await f.store.updateSettings({themeMode:"light",listeningAutoplay:false});
 const restarted=createSettingsStore(f.storage); await restarted.hydrate();
 assert.deepEqual(plain(restarted.getSnapshot().preferences),{schemaVersion:1,themeMode:"light",listeningAutoplay:false});
 assert.equal(f.values.get("protected-draft"),"fixture-draft");
 assert.equal(f.values.get("settings:study-time-goal:v1"),"fixture-goal");
 assert.ok(f.calls.every(([,key])=>key===SETTINGS_STORAGE_KEY));
});
for(const [label,raw,code] of [
 ["malformed JSON","{bad","malformed"], ["array","[]","malformed"], ["null","null","malformed"],
 ["missing schema",JSON.stringify({themeMode:"dark"}),"unsupported-version"],
 ["older v0 (no supported historical migration)",stored({schemaVersion:0}),"unsupported-version"],
 ["future schema",stored({schemaVersion:2}),"unsupported-version"],
]) test(label+" is retained and blocks destructive fallback writes",async()=>{
 const f=fixture(raw); await assert.rejects(f.store.hydrate(),e=>e.code===code);
 await assert.rejects(f.store.updateSettings({themeMode:"light"}),e=>e.code===code);
 assert.equal(f.values.get(SETTINGS_STORAGE_KEY),raw); assert.equal(f.calls.length,1);
 assert.equal(f.store.getSnapshot().hydration,"error");
});
test("v1 recovers invalid fields independently, visibly, with no implicit repair write",async()=>{
 const f=fixture(stored({themeMode:17})); await f.store.hydrate();
 assert.deepEqual(plain(f.store.getSnapshot().preferences),{schemaVersion:1,themeMode:"system",listeningAutoplay:false});
 assert.deepEqual(plain(f.store.getSnapshot().recoveredFields),["themeMode"]); assert.equal(f.calls.length,1);
 const other=parseStoredSettings(JSON.stringify({schemaVersion:1,themeMode:"light"}));
 assert.equal(other.preferences.themeMode,"light"); assert.equal(other.preferences.listeningAutoplay,true);
});
test("partial updates before slow hydration wait for existing preferences",async()=>{
 const gate=deferred(),f=fixture(); f.storage.getItem=()=>gate.promise;
 const hydration=f.store.hydrate(); const update=f.store.updateSettings({themeMode:"light"});
 await Promise.resolve(); assert.equal(f.store.getSnapshot().hydration,"loading"); assert.equal(f.calls.length,0);
 gate.resolve(stored()); await Promise.all([hydration,update]);
 assert.deepEqual(JSON.parse(f.values.get(SETTINGS_STORAGE_KEY)),{schemaVersion:1,themeMode:"light",listeningAutoplay:false});
});
test("two concurrent partial updates serialize even with a slow first write",async()=>{
 const gate=deferred(), f=fixture(stored()); await f.store.hydrate();
 const write=f.storage.setItem; let active=0,maxActive=0,writes=0;
 f.storage.setItem=async(key,value)=>{ active++; maxActive=Math.max(maxActive,active); if(++writes===1) await gate.promise; await write(key,value); active--; };
 const a=f.store.updateSettings({themeMode:"light"}),b=f.store.updateSettings({listeningAutoplay:true});
 await new Promise(resolve=>setImmediate(resolve)); assert.equal(writes,1); assert.equal(f.store.getSnapshot().preferences.themeMode,"dark");
 gate.resolve(); await Promise.all([a,b]); assert.equal(maxActive,1);
 assert.deepEqual(JSON.parse(f.values.get(SETTINGS_STORAGE_KEY)),{schemaVersion:1,themeMode:"light",listeningAutoplay:true});
});
test("read failure blocks writes and only explicit hydration retry recovers",async()=>{
 const f=fixture(stored()); let unavailable=true; const read=f.storage.getItem;
 f.storage.getItem=async key=>{ if(unavailable) throw Error("fixture-sensitive-detail"); return read(key); };
 await assert.rejects(f.store.hydrate(),e=>e.code==="read-failed"&&!e.message.includes("sensitive"));
 await assert.rejects(f.store.updateSettings({themeMode:"light"})); assert.equal(f.calls.length,0);
 unavailable=false; await f.store.hydrate(); await f.store.updateSettings({themeMode:"light"});
 assert.equal(f.store.getSnapshot().preferences.listeningAutoplay,false);
});
test("write failure rejects without claiming saved, and later queue operations still work",async()=>{
 const f=fixture(stored()); await f.store.hydrate(); const write=f.storage.setItem;
 f.storage.setItem=async()=>{throw Error("fixture-sensitive-detail");};
 await assert.rejects(f.store.updateSettings({themeMode:"light"}),e=>e.code==="write-failed"&&!e.message.includes("sensitive"));
 assert.equal(f.store.getSnapshot().preferences.themeMode,"dark"); assert.equal(f.store.getSnapshot().persistence,"error");
 assert.equal(JSON.parse(f.values.get(SETTINGS_STORAGE_KEY)).themeMode,"dark");
 f.storage.setItem=write; await f.store.updateSettings({listeningAutoplay:true});
 assert.equal(f.store.getSnapshot().preferences.themeMode,"dark"); assert.equal(f.store.getSnapshot().persistence,"saved");
 assert.equal(f.store.getSnapshot().persistenceError,null);
});
test("invalid/foreign/undefined fields cannot enter device storage",async()=>{
 const f=fixture(); for(const patch of [{themeMode:"sepia"},{listeningAutoplay:1},{themeMode:undefined},{profile:{}},{schemaVersion:2},{guestReminderDesired:true},null,[]]) {
  await assert.rejects(f.store.updateSettings(patch),e=>e.code==="invalid-update");
 } assert.equal(f.calls.length,0);
});
test("queued patches are copied at call time and snapshots are immutable",async()=>{
 const f=fixture(stored()),patch={themeMode:"light"}; const pending=f.store.updateSettings(patch); patch.themeMode="dark";
 await pending; assert.equal(f.store.getSnapshot().preferences.themeMode,"light");
 assert.ok(Object.isFrozen(f.store.getSnapshot())); assert.ok(Object.isFrozen(f.store.getSnapshot().preferences));
});
test("repeated hydration performs one read; subscriptions can unsubscribe",async()=>{
 const f=fixture(stored()); let count=0; const unsubscribe=f.store.subscribe(()=>count++);
 await Promise.all([f.store.hydrate(),f.store.hydrate()]); assert.equal(f.calls.length,1); assert.ok(count>0);
 unsubscribe(); const before=count; await f.store.updateSettings({themeMode:"light"}); assert.equal(count,before);
});
