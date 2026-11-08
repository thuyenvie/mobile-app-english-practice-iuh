const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, tick } = require("./helpers/guest-runtime.cjs");

function deadlineClock(app) {
  let fire;
  let cleared = 0;
  app.setTimeout = (callback, duration) => {
    assert.equal(duration, 15_000);
    fire = callback;
    return 1;
  };
  app.clearTimeout = () => { cleared++; };
  return { expire: () => fire(), get cleared() { return cleared; } };
}

test("a stalled credential read times out and its late result cannot overwrite a successful retry", async () => {
  const finishReads = [];
  let stalled = true;
  const app = environment({ "expo-secure-store": {
    getItemAsync: () => stalled ? new Promise(resolve => { finishReads.push(resolve); }) : Promise.resolve(null),
  } });
  const clock = deadlineClock(app);
  const { restoreSession } = app.load("src/lib/auth/restoreSession.ts");
  const pending = restoreSession();
  assert.equal(restoreSession(), pending, "concurrent restores share one attempt");
  clock.expire();
  await pending;
  assert.match(app.session.getSessionSnapshot().error, /chế độ khách/);
  assert.equal(clock.cleared, 1);
  stalled = false;
  const retry = restoreSession();
  assert.equal(app.session.getSessionSnapshot().error, null);
  await retry;
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  const generation = app.session.getSessionSnapshot().generation;
  finishReads.forEach(resolve => resolve("late-token"));
  await tick();
  assert.equal(app.session.getSessionSnapshot().generation, generation);
  assert.equal(app.requests.length, 0);
});

test("a stalled profile request is aborted at the startup deadline without deleting credentials", async () => {
  const app = environment();
  app.secure.set("access_token", "stored-access");
  app.secure.set("refresh_token", "stored-refresh");
  let finishRequest;
  app.handler = () => new Promise(resolve => { finishRequest = resolve; });
  const clock = deadlineClock(app);
  const { restoreSession } = app.load("src/lib/auth/restoreSession.ts");
  const pending = restoreSession();
  await tick();
  assert.equal(typeof finishRequest, "function");
  clock.expire();
  await pending;
  assert.equal(app.requests[0].signal.aborted, true);
  assert.ok(app.session.getSessionSnapshot().error);
  assert.equal(app.secure.get("access_token"), "stored-access");
  assert.equal(app.secure.get("refresh_token"), "stored-refresh");

  app.handler = async () => ({ success: true, result: { userName: "alice" } });
  await restoreSession();
  const recovered = app.session.getSessionSnapshot();
  assert.equal(recovered.status, "authenticated");
  finishRequest({ success: true, result: { userName: "old-account" } });
  await tick();
  assert.equal(app.session.getSessionSnapshot(), recovered);
});

test("startup failure offers a Guest exit that mounts Home and preserves stored credentials", async () => {
  const app = environment();
  app.secure.set("access_token", "stored-access");
  app.secure.set("refresh_token", "stored-refresh");
  app.handler = async config => app.fail(config, 503);
  const Provider = app.load("src/providers/SessionProvider.tsx").SessionProvider;
  app.hooks.render(Provider, { children: { type: "Home" } });
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  app.hooks.render();
  assert.equal(app.hooks.output.props.loading, false);
  assert.match(app.hooks.output.props.backLabel, /trang chủ.*khách/);
  app.hooks.output.props.onBack();
  app.hooks.render();
  assert.equal(app.hooks.output.props.children.type, "Home");
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 2);
});
