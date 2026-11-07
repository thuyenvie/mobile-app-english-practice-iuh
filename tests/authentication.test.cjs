const test = require("node:test");
const assert = require("node:assert/strict");
const { Buffer } = require("node:buffer");
const { environment, button, tick } = require("./helpers/guest-runtime.cjs");

const token = subject => "header." + Buffer.from(JSON.stringify({ sub: subject })).toString("base64url") + ".signature";
const credentials = (subject = "fixture-user", refreshToken = "fixture-refresh") => ({
  success: true, result: { success: true, token: token(subject), refreshToken },
});
async function signIn(app) {
  app.session.enterGuestSession();
  app.handler = async () => credentials();
  await app.load("features/auth/api/authApi.ts").login({ userName: "fixture-user", passWord: "fixture-password" });
}

test("successful login persists both credentials before publishing authenticated", async () => {
  const app = environment();
  let storedBeforePublish = false;
  app.session.subscribeSession(() => {
    if (app.session.getSessionSnapshot().status === "authenticated") {
      storedBeforePublish = app.secure.has("access_token") && app.secure.has("refresh_token");
    }
  });
  await signIn(app);
  assert.equal(storedBeforePublish, true);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.requests[0].headers.get("Authorization"), undefined);
});

test("secondary API retry 401 preserves a session confirmed by Identity and rejects the feature request", async () => {
  const app = environment();
  await signIn(app);
  const generation = app.session.getSessionSnapshot().generation;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
    if (config.url === "/identity/user/my-info") return { success: true, result: { userName: "fixture-user" } };
    return app.fail(config, 401);
  };
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession(),
    error => error.response?.status === 401);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.session.getSessionSnapshot().generation, generation);
  assert.equal(app.secure.get("refresh_token"), "rotated-refresh");
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 1);
  assert.equal(app.requests.filter(r => r.url === "/identity/user/my-info").length, 1);
  assert.equal(app.requests.filter(r => r.url === "/exam-service/study-sessions/me/active").length, 2);
});

for (const reason of ["expired", "revoked"]) {
  test("Identity refresh rejection signs out an " + reason + " session", async () => {
    const app = environment();
    await signIn(app);
    app.handler = async config => {
      try { return app.fail(config, 401); }
      catch (error) {
        if (config.url === "/identity/auth/refresh") {
          error.response.data = { code: 1006, success: false, message: "Refresh token " + reason, result: null };
        }
        throw error;
      }
    };
    await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession());
    assert.equal(app.session.getSessionSnapshot().status, "guest");
    assert.equal(app.secure.size, 0);
  });
}

for (const status of [0, 403, 503]) {
  test("uncertain Identity verification preserves credentials, status " + status, async () => {
    const app = environment();
    await signIn(app);
    app.handler = async config => {
      if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
      if (config.url === "/identity/user/my-info") return app.fail(config, status);
      return app.fail(config, 401);
    };
    await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession(),
      error => error.response?.status === 401);
    assert.equal(app.session.getSessionSnapshot().status, "authenticated");
    assert.equal(app.secure.get("refresh_token"), "rotated-refresh");
  });
}

test("Identity rejects the refreshed access token, so the session really expires", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => config.url === "/identity/auth/refresh"
    ? credentials("fixture-user", "rotated-refresh") : app.fail(config, 401);
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession());
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
});

for (const offline of [false, true]) {
  test("explicit logout clears actual stored tokens, offline=" + offline, async () => {
    const mocks = {
      "@/providers/SettingsProvider": { useSettings: () => ({
        preferences: {}, hydration: "ready", persistence: "idle", recoveredFields: [],
        hydrationError: null, persistenceError: null,
      }) },
      "../../home/components/RecentStudyTimeCard": { RecentStudyTimeCard: "RecentStudyTimeCard" },
      "../../notifications/api/pushNotificationApi": { deactivateCurrentPushToken: async () => {} },
    };
    for (let i = 1; i <= 8; i++) {
      const name = "SET" + String(i).padStart(2, "0") + "Entry";
      mocks["../entries/" + name] = { [name]: name };
    }
    const app = environment(mocks);
    await signIn(app);
    app.handler = async config => offline ? app.fail(config, 503) : { success: true };
    const Screen = app.load("features/settings/screens/SettingsScreen.tsx").default;
    app.hooks.render(Screen);
    button(app.hooks.output, "Đăng xuất").props.onPress();
    app.alerts[0][2].find(action => action.style === "destructive").onPress();
    await app.hooks.flush();
    assert.equal(app.session.getSessionSnapshot().status, "guest");
    assert.equal(app.secure.size, 0);
    assert.deepEqual(app.routerCalls, [["replace", "/(tabs)/home"]]);
  });
}

test("Guest public 401 never refreshes, probes Identity, or touches stale credentials", async () => {
  const app = environment();
  app.session.enterGuestSession();
  app.secure.set("access_token", "stale-fixture-access");
  app.secure.set("refresh_token", "stale-fixture-refresh");
  app.handler = async config => app.fail(config, 401);
  await assert.rejects(app.load("src/lib/axios/axios.ts").publicApi.get("/exam-service/exams/ets-2026"));
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].headers.get("Authorization"), undefined);
  assert.equal(app.secure.size, 2);
});

test("an inconclusive Identity 200 does not erase the session or grant the denied feature", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
    if (config.url === "/identity/user/my-info") return { success: true, result: {} };
    return app.fail(config, 401);
  };
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession(),
    error => error.response?.status === 401);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.secure.size, 2);
});

test("Identity confirming a different owner invalidates the mismatched local session", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
    if (config.url === "/identity/user/my-info") return { success: true, result: { userName: "other-user" } };
    return app.fail(config, 401);
  };
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession());
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
});

test("a late Identity rejection cannot sign out a newly logged-in account", async () => {
  const app = environment();
  await signIn(app);
  let rejectVerification;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
    if (config.url === "/identity/auth/login") return credentials("new-user", "new-user-refresh");
    if (config.url === "/identity/user/my-info") return new Promise((_, reject) => {
      rejectVerification = () => { try { app.fail(config, 401); } catch (error) { reject(error); } };
    });
    return app.fail(config, 401);
  };
  const pending = app.load("features/study/session/studySessionApi.ts").getActiveStudySession();
  const rejected = assert.rejects(pending, { name: "SessionChangedError" });
  for (let i = 0; i < 30 && !rejectVerification; i++) await tick();
  assert.equal(typeof rejectVerification, "function");
  await app.load("features/auth/api/authApi.ts").login({ userName: "new-user", passWord: "fixture-password" });
  rejectVerification();
  await rejected;
  assert.equal(app.session.getSessionSnapshot().subject, "new-user");
  assert.equal(app.secure.get("refresh_token"), "new-user-refresh");
});

test("diagnostics record request/status, refresh outcome and transitions without credentials", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials("fixture-user", "rotated-refresh");
    if (config.url === "/identity/user/my-info") return { success: true, result: { userName: "fixture-user" } };
    return app.fail(config, 401);
  };
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession());
  assert.ok(app.diagnostics.some(e => e.event === "response" && e.status === 401));
  assert.ok(app.diagnostics.some(e => e.event === "refresh" && e.refresh === "success"));
  assert.ok(app.diagnostics.some(e => e.event === "session" && e.sessionBefore === "guest" && e.sessionAfter === "authenticated"));
  assert.ok(app.diagnostics.some(e => e.hasAccessToken === true && e.hasRefreshToken === true));
  const log = JSON.stringify(app.diagnostics);
  for (const secret of [token("fixture-user"), "fixture-password", "fixture-refresh", "rotated-refresh", "Authorization", "fixture-user"]) {
    assert.equal(log.includes(secret), false, "diagnostics must not contain credentials or account names");
  }
});

test("diagnostics redact query strings, URL credentials, unknown paths and arbitrary fields", () => {
  const app = environment();
  const { recordAuthDiagnostic } = app.load("src/lib/auth/authDiagnostics.ts");
  recordAuthDiagnostic("response", {
    endpoint: "https://fixture-user:fixture-password@host/api/identity/user/my-info?token=fixture-access#fixture-refresh",
    status: 401, token: "fixture-access", Authorization: "fixture-access", clientId: "fixture-client-id",
    error: { config: { password: "fixture-password" } },
  });
  recordAuthDiagnostic("request", { endpoint: "/exam-service/fixture-access?password=fixture-password" });
  assert.equal(app.diagnostics[0].endpoint, "/identity/user/my-info");
  assert.equal(app.diagnostics[1].endpoint, "/exam-service/[redacted]");
  const log = JSON.stringify(app.diagnostics);
  for (const secret of ["fixture-user", "fixture-password", "fixture-access", "fixture-refresh", "fixture-client-id", "Authorization"]) {
    assert.equal(log.includes(secret), false);
  }
});

for (const embedded of [true, false]) {
  test("update diagnostics identify embedded/OTA execution, embedded=" + embedded, () => {
    const app = environment({ "expo-updates": {
      isEnabled: true, isEmbeddedLaunch: embedded, channel: "preview", runtimeVersion: "1.0.0",
      updateId: "11111111-1111-4111-8111-111111111111",
    } });
    app.load("src/lib/auth/updateDiagnostics.ts").recordUpdateDiagnostic();
    assert.deepEqual(app.diagnostics.at(-1), {
      event: "updates", updatesEnabled: true, isEmbeddedLaunch: embedded,
      channel: "preview", runtimeVersion: "1.0.0", updateId: "11111111-1111-4111-8111-111111111111",
    });
  });
}

test("a diagnostics sink failure cannot interrupt session publication", () => {
  const app = environment();
  app.diagnostics.push = () => { throw Error("fixture logging unavailable"); };
  assert.doesNotThrow(() => app.session.enterGuestSession());
  assert.equal(app.session.getSessionSnapshot().status, "guest");
});

test("concurrent downstream retry failures share one in-flight Identity verification", async () => {
  const app = environment();
  await signIn(app);
  let finishVerification;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") { await tick(); return credentials(); }
    if (config.url === "/identity/user/my-info") return new Promise(resolve => { finishVerification = resolve; });
    return app.fail(config, 401);
  };
  const client = app.load("src/lib/axios/axios.ts").default;
  const result = Promise.allSettled([
    client.get("/exam-service/study-sessions/me/active"), client.get("/exam-service/study-tasks"),
  ]);
  for (let i = 0; i < 30 && app.requests.filter(r => r.url.startsWith("/exam-service/")).length < 4; i++) await tick();
  assert.equal(typeof finishVerification, "function");
  assert.equal(app.requests.filter(r => r.url === "/identity/user/my-info").length, 1);
  finishVerification({ success: true, result: { userName: "fixture-user" } });
  const failures = await result;
  assert.equal(failures.every(r => r.status === "rejected" && r.reason.response?.status === 401), true);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("Identity my-info retry 401 expires without recursive verification or refresh", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => config.url === "/identity/auth/refresh" ? credentials() : app.fail(config, 401);
  await assert.rejects(app.load("src/lib/axios/axios.ts").default.get("/identity/user/my-info"));
  assert.equal(app.requests.filter(r => r.url === "/identity/user/my-info").length, 2);
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 1);
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
});

test("refresh service outage logs failure and keeps the authenticated credentials", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => app.fail(config, config.url === "/identity/auth/refresh" ? 503 : 401);
  await assert.rejects(app.load("features/study/session/studySessionApi.ts").getActiveStudySession());
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.secure.get("refresh_token"), "fixture-refresh");
  assert.ok(app.diagnostics.some(e => e.event === "refresh" && e.refresh === "failure"));
});

test("a verification of an older access token cannot delete a subsequently rotated pair", async () => {
  const app = environment();
  await signIn(app);
  let rejectVerification;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return credentials();
    if (config.url === "/identity/user/my-info") return new Promise((_, reject) => {
      rejectVerification = () => { try { app.fail(config, 401); } catch (error) { reject(error); } };
    });
    return app.fail(config, 401);
  };
  const pending = app.load("features/study/session/studySessionApi.ts").getActiveStudySession();
  const failure = assert.rejects(pending, error => error.response?.status === 401);
  for (let i = 0; i < 30 && !rejectVerification; i++) await tick();
  assert.equal(typeof rejectVerification, "function");
  await app.load("src/lib/auth/tokenStorage.ts").saveTokenPair(
    token("fixture-user").replace(".signature", ".rotated-signature"), "subsequently-rotated-refresh",
  );
  rejectVerification();
  await failure;
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.secure.get("refresh_token"), "subsequently-rotated-refresh");
});
