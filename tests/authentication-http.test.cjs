const test = require("node:test");
const assert = require("node:assert/strict");
const { Buffer } = require("node:buffer");
const http = require("node:http");
const { once } = require("node:events");
const axios = require("axios");
const { environment } = require("./helpers/guest-runtime.cjs");

const paths = ["/exam-service/study-tasks", "/exam-service/study-plans/me/today",
  "/exam-service/study-plans/me", "/exam-service/study-sessions/me/active"];
const identityPath = "/identity/user/my-info";
const refreshPath = "/identity/auth/refresh";

async function fixture(t, scenario) {
  const payload = Buffer.from(JSON.stringify({ sub: "offline-http-user" })).toString("base64url");
  const oldToken = "header." + payload + ".old-fixture";
  const newToken = "header." + payload + ".new-fixture";
  const counts = new Map();
  const pair = accessToken => ({ success: true, result: {
    success: true, token: accessToken, refreshToken: "offline-refresh-fixture",
  } });
  const server = http.createServer((request, response) => {
    const path = request.url;
    counts.set(path, (counts.get(path) ?? 0) + 1);
    const oldAccess = request.headers.authorization === "Bearer " + oldToken;
    let status = 200;
    let body = { code: 0, result: [] };
    if (path === "/identity/auth/login") body = pair(oldToken);
    else if (path === identityPath) {
      status = scenario !== "valid-session" && oldAccess ? 401 : 200;
      body = status === 200 ? { success: true, result: { userName: "offline-http-user" } } : { code: 1006 };
    } else if (path === refreshPath) {
      status = scenario === "revoked-refresh" ? 401 : 200;
      body = status === 200 ? pair(newToken) : { code: 1006, success: false };
    } else if (paths.includes(path)) {
      status = scenario === "expired-access" && !oldAccess ? 200 : 401;
      if (status === 401) body = { code: 1006 };
    } else {
      status = 501;
    }
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const app = environment({ axios: { ...axios, create: config => axios.create({
    ...config, baseURL: "http://127.0.0.1:" + server.address().port,
    adapter: axios.getAdapter("http"), proxy: false,
  }) } });
  app.session.enterGuestSession();
  await app.load("features/auth/api/authApi.ts").login({ userName: "offline-http-user", passWord: "offline-fixture" });
  return { app, client: app.load("src/lib/axios/axios.ts").default, count: path => counts.get(path) ?? 0 };
}

test("real HTTP: simultaneous and sequential Exam denials keep Identity-valid sessions without refresh", async t => {
  const { app, client, count } = await fixture(t, "valid-session");
  const results = await Promise.allSettled(paths.map(path => client.get(path)));
  assert.ok(results.every(result => result.status === "rejected" && result.reason.response?.status === 401));
  for (const path of paths) await assert.rejects(client.get(path), error => error.response?.status === 401);
  assert.equal(count(identityPath), 1);
  assert.equal(count(refreshPath), 0);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("real HTTP: simultaneous expired-token requests share one refresh and retry successfully", async t => {
  const { app, client, count } = await fixture(t, "expired-access");
  const results = await Promise.allSettled(paths.map(path => client.get(path)));
  assert.ok(results.every(result => result.status === "fulfilled"));
  assert.equal(count(refreshPath), 1);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("real HTTP: Exam retry 401 stays rejected without another refresh once Identity accepts", async t => {
  const { app, client, count } = await fixture(t, "retry-denied");
  const results = await Promise.allSettled(paths.map(path => client.get(path)));
  assert.ok(results.every(result => result.status === "rejected" && result.reason.response?.status === 401));
  for (const path of paths) await assert.rejects(client.get(path));
  assert.equal(count(refreshPath), 1);
  assert.equal(count(identityPath), 2);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("real HTTP: rejected refresh still clears credentials and returns to Guest", async t => {
  const { app, client, count } = await fixture(t, "revoked-refresh");
  const results = await Promise.allSettled(paths.map(path => client.get(path)));
  assert.ok(results.every(result => result.status === "rejected"));
  assert.equal(count(refreshPath), 1);
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
});
