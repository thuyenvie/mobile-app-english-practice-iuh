const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, tick } = require("./helpers/guest-runtime.cjs");

function fixture() {
  const app = environment();
  app.session.authenticateSession("account@gmail.com");
  const Entry = app.load("features/settings/entries/AccountPasswordEntry.tsx").AccountPasswordEntry;
  const props = { authenticated: true, theme: {}, settings: {} };
  const render = () => app.hooks.render(Entry, props);
  return { app, props, render };
}

for (const hasPassword of [false, undefined, null, "true", true]) {
  test(`password controls require confirmed local password; capability=${hasPassword}`, async () => {
    const { app, render } = fixture();
    app.handler = async () => ({ success: true, result: { userName: "account@gmail.com", hasPassword } });
    assert.equal(render(), null, "Do not flash a form before the profile response");
    await app.hooks.flush();
    if (hasPassword === true) {
      assert.equal(app.hooks.output.type.name, "SET05Entry");
      assert.equal(app.hooks.output.key, app.session.getSessionSnapshot().generation);
    } else assert.equal(app.hooks.output, null);
    assert.equal(app.requests.length, 1);
    assert.equal(app.requests[0].url, "/identity/user/my-info");
    assert.equal(app.requests[0].method, "get");
    app.hooks.dispose();
  });
}

test("Guest and unfocused settings never request account capability", async () => {
  const { app, props, render } = fixture();
  app.focused = false; render(); await app.hooks.flush();
  assert.equal(app.hooks.output, null); assert.equal(app.requests.length, 0);
  app.focused = true; app.session.enterGuestSession(); props.authenticated = false;
  render(); await app.hooks.flush();
  assert.equal(app.hooks.output, null); assert.equal(app.requests.length, 0);
});

test("network failure keeps password controls hidden and retries on focus", async () => {
  const { app, render } = fixture();
  app.handler = async () => { throw Error("offline fixture"); };
  render(); await app.hooks.flush(); assert.equal(app.hooks.output, null);
  app.focused = false; render();
  app.handler = async () => ({ success: true, result: { hasPassword: true } });
  app.focused = true; render(); await app.hooks.flush();
  assert.equal(app.hooks.output.type.name, "SET05Entry"); assert.equal(app.requests.length, 2);
  app.hooks.dispose();
});

test("switching local account to Google or Guest immediately hides the prior password form", async () => {
  const { app, props, render } = fixture();
  app.handler = async () => ({ success: true, result: { hasPassword: true } });
  render(); await app.hooks.flush(); assert.equal(app.hooks.output.type.name, "SET05Entry");
  app.session.authenticateSession("google@gmail.com");
  app.handler = async () => ({ success: true, result: { hasPassword: false } });
  assert.equal(render(), null); await app.hooks.flush(); assert.equal(app.hooks.output, null);
  app.session.enterGuestSession(); props.authenticated = false;
  assert.equal(render(), null); await app.hooks.flush();
  assert.equal(app.requests.length, 2); assert.equal(app.secure.size, 0);
});

test("late capability response cannot reveal password controls for another account", async () => {
  const { app, render } = fixture();
  let resolveOld;
  app.handler = () => new Promise(resolve => { resolveOld = resolve; });
  render(); await tick();
  app.session.authenticateSession("google@gmail.com");
  app.handler = async () => ({ success: true, result: { hasPassword: false } });
  render(); await app.hooks.flush();
  resolveOld({ success: true, result: { hasPassword: true } });
  await app.hooks.flush(); assert.equal(app.hooks.output, null);
  assert.equal(app.session.getSessionSnapshot().subject, "google@gmail.com");
});

test("capability checks never expose credentials or modify stored session tokens", async () => {
  const { app, render } = fixture();
  const before = app.session.getSessionSnapshot();
  app.handler = async () => ({ success: true, result: { hasPassword: false } });
  render(); await app.hooks.flush();
  assert.equal(app.session.getSessionSnapshot(), before);
  assert.equal(app.storageCalls.some(([operation]) => /set|delete/.test(operation)), false);
  assert.equal(app.requests.some(request => request.method !== "get"), false);
});
