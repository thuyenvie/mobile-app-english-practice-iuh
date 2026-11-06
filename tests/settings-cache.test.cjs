const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text, button } = require("./helpers/guest-runtime.cjs");
const proposal = { owner: "fixture-download", canonicalRoot: "file:///fixture/cache/app-owned-cache/download", regenerateProof: "Fixture only: regenerate from fixture source" };
const file = (name, patch = {}) => ({ owner: proposal.owner, relativePath: name, canonicalPath: proposal.canonicalRoot + "/" + name, kind: "file", symbolicLink: false, inUse: false, bytes: 12, ...patch });
const load = () => environment().load("features/settings/services/cacheService.ts");
const plain = value => JSON.parse(JSON.stringify(value));

test("production allowlist is empty: zero scoped bytes, unknown library caches, no storage scan or deletion", async () => {
  const { createCacheInventoryService, cacheInventoryService } = load();
  const service = createCacheInventoryService({ inspect: async () => { throw Error("Protected storage must not be enumerated"); }, remove: () => { throw Error("No mutation capability"); } });
  const result = await service.inventory();
  assert.equal(result.items, 0); assert.equal(result.bytes, 0); assert.equal(result.libraryCacheBytes, null);
  assert.equal(result.deletionEnabled, false); assert.equal(result.approval, "pending");
  assert.deepEqual(Object.keys(service), ["inventory"]);
  assert.equal((await cacheInventoryService.inventory()).items, 0);
});

test("seeded credentials/drafts/legacy empty marker/AI/retry/settings/push/RAM remain byte-identical on repeated inspection", async () => {
  const { createCacheInventoryService } = load();
  const storage = new Map([
    ["access_token", "fixture-access"], ["refresh_token", "fixture-refresh"],
    ["full-test:v1:fixture:2026:1", '{"answers":{"1":"A"}}'],
    ["practice-parts:v1:fixture:2026:1:1-7", "fixture-practice"],
    ["listening:v1:fixture:2026:1:part:1", '{"answers":{}}'],
    ["listening:v1:fixture:2026:1", "fixture-legacy"], ["reading:v1:fixture:2026:1:5", "fixture-reading"],
    ["@ai-question-images-v2:fixture", "fixture-index"], ["study-session-pause:fixture", "fixture-pause"],
    ["settings:study-time-goal:v1", "fixture-goal"], ["@english-practice/settings:v1", "fixture-preferences"],
    ["expo_push_token_current_device", "fixture-push"], ["future-local-schedule-ids", "fixture-schedule"],
  ]);
  const files = new Map([["file:///documents/ai-question-images/fixture.jpg", "fixture-image"], ["file:///cache/native-library/audio", "fixture-native"], [proposal.canonicalRoot + "/temporary.mp3", "fixture-disposable"]]);
  const guest = { answers: { 1: "B" }, timer: 42, result: { score: 1 } };
  const before = JSON.stringify({ storage: [...storage], files: [...files], guest });
  const service = createCacheInventoryService({ inspect: async () => [file("temporary.mp3")] }, [proposal]);
  for (let i = 0; i < 3; i++) {
    const result = await service.inventory(); assert.equal(result.items, 1); assert.equal(result.deletionEnabled, false);
  }
  assert.equal(JSON.stringify({ storage: [...storage], files: [...files], guest }), before);
});

test("preview accepts owned files only and never recursively includes directories", async () => {
  const { createCacheInventoryService } = load();
  const service = createCacheInventoryService({ inspect: async () => [file("one.mp3"), file("folder", { kind: "directory" }), file("foreign", { owner: "other" }), file("locked", { inUse: true })] }, [proposal]);
  const result = await service.inventory(); assert.equal(result.items, 1); assert.equal(result.bytes, 12); assert.equal(result.excludedItems, 3);
});
test("traversal/encoding/absolute/backslash/symlink/canonical escape targets are excluded", async () => {
  const { createCacheInventoryService } = load();
  const bad = ["../ai-question-images/private.jpg", "nested/../../private", "/documents/private", "%2e%2e/private", "%252e%252e/private", "..\\private", "safe/../private", "file:///documents/private", "name."];
  const service = createCacheInventoryService({ inspect: async () => [...bad.map(n => file(n)), file("link", { symbolicLink: true }), file("parent-link/file", { canonicalPath: "file:///documents/ai-question-images/private" })] }, [proposal]);
  const result = await service.inventory(); assert.equal(result.items, 0); assert.equal(result.excludedItems, bad.length + 2);
});
test("whole cache/document/protected roots and unproven ownership never reach the reader", async () => {
  const { createCacheInventoryService } = load(); let reads = 0;
  const bad = ["file:///fixture/cache", "file:///documents", "file:///documents/ai-question-images/app-owned-cache/images", "https://server/app-owned-cache/files"];
  const service = createCacheInventoryService({ inspect: async () => { reads++; return []; } }, [...bad.map(canonicalRoot => ({ ...proposal, canonicalRoot })), { ...proposal, regenerateProof: "" }]);
  const result = await service.inventory(); assert.equal(reads, 0); assert.equal(result.failedRoots, 5); assert.equal(result.bytes, null);
});
test("missing/locked metadata yields partial unknown size; retry never claims a delete", async () => {
  const { createCacheInventoryService } = load(); let fail = true;
  const service = createCacheInventoryService({ inspect: async () => { if (fail) throw Error("fixture denied"); return [file("ok")]; } }, [proposal]);
  const first = await service.inventory(); assert.equal(first.status, "partial"); assert.equal(first.bytes, null);
  fail = false; const next = await service.inventory(); assert.equal(next.bytes, 12); assert.equal(next.status, "ready"); assert.equal(next.deletionEnabled, false);
});
test("unknown/invalid sizes and duplicate metadata do not fabricate freed bytes", async () => {
  const { createCacheInventoryService } = load();
  const service = createCacheInventoryService({ inspect: async () => [file("one"), file("one"), file("unknown", { bytes: null }), file("negative", { bytes: -1 }), file("invalid", { bytes: Infinity })] }, [proposal]);
  const result = await service.inventory(); assert.equal(result.items, 2); assert.equal(result.bytes, null); assert.equal(result.excludedItems, 3);
});
test("double inspection shares one in-flight read and takes a fresh snapshot after fixture writer/account changes", async () => {
  const { createCacheInventoryService } = load(); let reads = 0, resolve;
  const service = createCacheInventoryService({ inspect: () => { reads++; return new Promise(done => { resolve = done; }); } }, [proposal]);
  const one = service.inventory(), two = service.inventory(); assert.equal(one, two); assert.equal(reads, 1);
  resolve([file("snapshot", { bytes: 5 })]); assert.equal((await one).bytes, 5);
  const next = service.inventory(); assert.equal(reads, 2); resolve([file("new-snapshot", { bytes: 9 })]); assert.equal((await next).bytes, 9);
});

const theme = Object.fromEntries(["surface", "border", "text", "muted", "accent", "warning", "error"].map(k => [k, "#000"]));
test("cache UI keeps clear disabled for Guest/User and active study; inspect and cancel preserve storage", async () => {
  for (const authenticated of [false, true]) {
    const app = environment(); if (authenticated) app.session.authenticateSession("fixture");
    app.local.set("fixture-protected", "unchanged"); app.secure.set("fixture-access", "unchanged");
    const Panel = app.load("features/settings/components/CacheInventoryPanel.tsx").CacheInventoryPanel;
    let closed = 0;
    app.hooks.render(Panel, { theme, activeStudy: true, onClose: () => { closed++; } });
    assert.match(text(app.hooks.output), /phiên học/);
    const clear = nodes(app.hooks.output).find(n => text(n) === "Xóa bộ nhớ đệm (chưa bật)" && n.props.disabled);
    assert.ok(clear); assert.equal(clear.props.onPress, undefined);
    button(app.hooks.output, "Kiểm tra dung lượng").props.onPress(); await app.hooks.flush();
    assert.match(text(app.hooks.output), /0 B/); assert.match(text(app.hooks.output), /Không có cache/);
    button(app.hooks.output, "Đóng, giữ nguyên").props.onPress(); assert.equal(closed, 1);
    assert.deepEqual([...app.local], [["fixture-protected", "unchanged"]]); assert.deepEqual([...app.secure], [["fixture-access", "unchanged"]]);
    assert.equal(app.requests.length, 0); assert.equal(app.storageCalls.length, 0); app.hooks.dispose();
  }
});
test("closing an in-flight scan ignores its completion without clearing or reopening UI", async () => {
  let resolve; const app = environment({ "../services/cacheService": { cacheInventoryService: { inventory: () => new Promise(done => { resolve = done; }) } } });
  const Panel = app.load("features/settings/components/CacheInventoryPanel.tsx").CacheInventoryPanel; let closed = false;
  app.hooks.render(Panel, { theme, activeStudy: false, onClose: () => { closed = true; } });
  button(app.hooks.output, "Kiểm tra dung lượng").props.onPress(); await app.hooks.flush();
  button(app.hooks.output, "Đóng, giữ nguyên").props.onPress(); resolve({ items: 99, bytes: 999, status: "ready" }); await app.hooks.flush();
  assert.equal(closed, true); assert.ok(!text(app.hooks.output).includes("999")); assert.equal(app.requests.length, 0); app.hooks.dispose();
});
test("inventory service does not mutate proposal input or leak account/file contents in results", async () => {
  const { createCacheInventoryService } = load(); const roots = [{ ...proposal }];
  const service = createCacheInventoryService({ inspect: async () => [file("one")] }, roots);
  roots[0].canonicalRoot = "file:///documents";
  const result = await service.inventory(); assert.equal(result.items, 1);
  assert.ok(!JSON.stringify(result).includes("fixture-download")); assert.ok(!JSON.stringify(result).includes("one"));
  assert.equal(plain(result).deletionEnabled, false);
});
