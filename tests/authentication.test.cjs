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

test("secondary API 401 confirmed by Identity rejects the feature without refreshing", async () => {
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
  assert.equal(app.secure.get("refresh_token"), "fixture-refresh");
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 0);
  assert.equal(app.requests.filter(r => r.url === "/identity/user/my-info").length, 1);
  assert.equal(app.requests.filter(r => r.url === "/exam-service/study-sessions/me/active").length, 1);
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
    assert.equal(app.secure.get("refresh_token"), "fixture-refresh");
    assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 0);
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
  let refreshed = false;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") { refreshed = true; return credentials("fixture-user", "rotated-refresh"); }
    if (config.url === "/identity/user/my-info") return refreshed
      ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
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

test("concurrent downstream failures share one in-flight Identity verification", async () => {
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
  for (let i = 0; i < 30 && !finishVerification; i++) await tick();
  assert.equal(typeof finishVerification, "function");
  assert.equal(app.requests.filter(r => r.url === "/identity/user/my-info").length, 1);
  finishVerification({ success: true, result: { userName: "fixture-user" } });
  const failures = await result;
  assert.equal(failures.every(r => r.status === "rejected" && r.reason.response?.status === 401), true);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 0);
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

const countRequests = (app, path) => app.requests.filter(request => request.url === path).length;
const identityPath = "/identity/user/my-info";
const refreshPath = "/identity/auth/refresh";
const studyPaths = ["/exam-service/study-tasks", "/exam-service/study-plans/me/today",
  "/exam-service/study-plans/me", "/exam-service/study-sessions/me/active"];

test("sequential study denials share a short Identity cache and never report session expiry", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => config.url === identityPath
    ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
  const client = app.load("src/lib/axios/axios.ts").default;
  for (const path of studyPaths) {
    await assert.rejects(client.get(path), error => {
      assert.equal(error.response.status, 401);
      assert.equal(app.load("features/study/api/examApi.ts").getExamErrorMessage(error),
        "Chưa tải được dữ liệu học tập. Vui lòng thử lại.");
      return true;
    });
  }
  assert.equal(countRequests(app, identityPath), 1);
  assert.equal(countRequests(app, refreshPath), 0);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("an expired access token refreshes once, but an Exam retry denial preserves the verified session", async () => {
  const app = environment();
  await signIn(app);
  let refreshed = false;
  app.handler = async config => {
    if (config.url === refreshPath) { refreshed = true; return credentials("fixture-user", "rotated-refresh"); }
    if (config.url === identityPath) return refreshed
      ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
    return app.fail(config, 401);
  };
  const client = app.load("src/lib/axios/axios.ts").default;
  await assert.rejects(client.get(studyPaths[0]), error => error.response?.status === 401);
  await assert.rejects(client.get(studyPaths[1]), error => error.response?.status === 401);
  assert.equal(countRequests(app, refreshPath), 1);
  assert.equal(countRequests(app, studyPaths[0]), 2);
  assert.equal(countRequests(app, identityPath), 2);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("verification expires at JWT expiry even within the 30-second cache lifetime", async () => {
  const app = environment();
  await signIn(app);
  let now = 1_800_000_000_000;
  app.now = () => now;
  const expiring = "header." + Buffer.from(JSON.stringify({ sub: "fixture-user", exp: now / 1000 + 2 }))
    .toString("base64url") + ".signature";
  await app.load("src/lib/auth/tokenStorage.ts").saveTokenPair(expiring, "fixture-refresh");
  app.handler = async config => {
    if (config.url === refreshPath) return credentials("fixture-user", "rotated-refresh");
    if (config.url === identityPath) return now < 1_800_000_002_000
      ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
    return config.headers.get("Authorization") === "Bearer " + expiring ? app.fail(config, 401) : { result: [] };
  };
  const client = app.load("src/lib/axios/axios.ts").default;
  await assert.rejects(client.get(studyPaths[0]));
  now += 2_001;
  await client.get(studyPaths[0]);
  assert.equal(countRequests(app, refreshPath), 1);
  assert.equal(countRequests(app, identityPath), 2);
});

test("Identity is rechecked after 30 seconds, token rotation and account generation changes", async () => {
  const app = environment();
  await signIn(app);
  let now = 1_800_000_000_000;
  app.now = () => now;
  app.handler = async config => config.url === identityPath
    ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
  const client = app.load("src/lib/axios/axios.ts").default;
  const denied = () => assert.rejects(client.get(studyPaths[0]));
  await denied(); await denied();
  assert.equal(countRequests(app, identityPath), 1);
  now += 30_001;
  await denied();
  assert.equal(countRequests(app, identityPath), 2);
  await app.load("src/lib/auth/tokenStorage.ts").saveTokenPair(token("fixture-user") + "-rotated", "rotated-refresh");
  await denied();
  assert.equal(countRequests(app, identityPath), 3);
  app.session.authenticateSession("fixture-user");
  await denied();
  assert.equal(countRequests(app, identityPath), 4);
  assert.equal(countRequests(app, refreshPath), 0);
});

test("Identity and refresh outages use bounded cooldowns and allow later recovery", async () => {
  const app = environment();
  await signIn(app);
  let now = 1_800_000_000_000;
  app.now = () => now;
  app.handler = async config => app.fail(config, config.url === identityPath ? 503 : 401);
  const client = app.load("src/lib/axios/axios.ts").default;
  await assert.rejects(client.get(studyPaths[0]));
  await assert.rejects(client.get(studyPaths[1]));
  assert.equal(countRequests(app, identityPath), 1);
  assert.equal(countRequests(app, refreshPath), 0);
  now += 5_001;
  app.handler = async config => app.fail(config, config.url === refreshPath ? 503 : 401);
  await assert.rejects(client.get(studyPaths[0]));
  await assert.rejects(client.get(studyPaths[1]));
  assert.equal(countRequests(app, refreshPath), 1);
  assert.equal(countRequests(app, identityPath), 2);
  now += 5_001;
  app.handler = async config => {
    if (config.url === identityPath) return app.fail(config, 401);
    if (config.url === refreshPath) return credentials("fixture-user", "recovered-refresh");
    return config._accessTokenRetried ? { result: [] } : app.fail(config, 401);
  };
  await client.get(studyPaths[0]);
  assert.equal(countRequests(app, refreshPath), 2);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("a direct Identity 401 overrides cached validity and a revoked refresh ends the session", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => config.url === identityPath
    ? { success: true, result: { userName: "fixture-user" } } : app.fail(config, 401);
  const client = app.load("src/lib/axios/axios.ts").default;
  await assert.rejects(client.get(studyPaths[0]));
  app.handler = async config => app.fail(config, 401);
  await assert.rejects(client.get(identityPath));
  assert.equal(countRequests(app, refreshPath), 1);
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
});

test("a late 401 from the old access token reuses the rotated token without a second refresh", async () => {
  const app = environment();
  await signIn(app);
  let rejectOldRequest;
  const rotated = credentials("fixture-user", "rotated-refresh");
  rotated.result.token += "-rotated";
  app.handler = async config => {
    if (config.url === refreshPath) return rotated;
    if (config.url === identityPath) return config._accessTokenRetried ? { success: true } : app.fail(config, 401);
    if (config.headers.get("Authorization") === "Bearer " + rotated.result.token) return { result: [] };
    return new Promise((_, reject) => { rejectOldRequest = () => {
      try { app.fail(config, 401); } catch (error) { reject(error); }
    }; });
  };
  const client = app.load("src/lib/axios/axios.ts").default;
  const pending = client.get(studyPaths[0]);
  for (let i = 0; i < 30 && !rejectOldRequest; i++) await tick();
  await client.get(identityPath);
  rejectOldRequest();
  await pending;
  assert.equal(countRequests(app, refreshPath), 1);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("Exam 403 remains a feature rejection without verification or refresh", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => app.fail(config, 403);
  await assert.rejects(app.load("src/lib/axios/axios.ts").default.get(studyPaths[0]), error => error.response.status === 403);
  assert.equal(countRequests(app, identityPath), 0);
  assert.equal(countRequests(app, refreshPath), 0);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("an Identity outage still backs off when the cached JWT expiry is already past", async () => {
  const app = environment();
  await signIn(app);
  const expired = "header." + Buffer.from(JSON.stringify({ sub: "fixture-user", exp: 1 })).toString("base64url") + ".signature";
  await app.load("src/lib/auth/tokenStorage.ts").saveTokenPair(expired, "fixture-refresh");
  app.handler = async config => app.fail(config, config.url === identityPath ? 503 : 401);
  const client = app.load("src/lib/axios/axios.ts").default;
  for (const path of studyPaths) await assert.rejects(client.get(path));
  assert.equal(countRequests(app, identityPath), 1);
  assert.equal(countRequests(app, refreshPath), 0);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("response diagnostics preserve only numeric business codes", async () => {
  const app = environment();
  await signIn(app);
  app.handler = async config => {
    if (config.url === identityPath) return { success: true, result: { userName: "fixture-user" } };
    try { app.fail(config, 401); } catch (error) {
      error.response.data = { code: 1006, message: "sensitive-fixture-message" };
      throw error;
    }
  };
  await assert.rejects(app.load("src/lib/axios/axios.ts").default.get(studyPaths[0]));
  assert.ok(app.diagnostics.some(event => event.status === 401 && event.code === 1006));
  const { recordAuthDiagnostic } = app.load("src/lib/auth/authDiagnostics.ts");
  recordAuthDiagnostic("response", { code: "sensitive-fixture-code" });
  assert.equal("code" in app.diagnostics.at(-1), false);
  assert.equal(JSON.stringify(app.diagnostics).includes("sensitive-fixture"), false);
});

test("Google login keeps the normal credential and session flow when study APIs are denied", async () => {
  const app = environment();
  app.session.enterGuestSession();
  app.handler = async config => {
    if (config.url === "/identity/auth/google") return credentials();
    if (config.url === identityPath) return { success: true, result: { userName: "fixture-user" } };
    return app.fail(config, 401);
  };
  await app.load("features/auth/api/authApi.ts").loginWithGoogleIdToken("offline-google-id-token-fixture");
  assert.equal(app.requests[0].headers.get("Authorization"), undefined);
  await assert.rejects(app.load("src/lib/axios/axios.ts").default.get(studyPaths[0]));
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.session.getSessionSnapshot().subject, "fixture-user");
  assert.equal(countRequests(app, refreshPath), 0);
  assert.equal(JSON.stringify(app.diagnostics).includes("offline-google-id-token-fixture"), false);
});

test("Google login rejection does not trigger Identity verification or refresh", async () => {
  const app = environment();
  app.session.enterGuestSession();
  app.handler = async config => app.fail(config, 401);
  await assert.rejects(app.load("features/auth/api/authApi.ts").loginWithGoogleIdToken("offline-google-id-token-fixture"));
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(countRequests(app, identityPath), 0);
  assert.equal(countRequests(app, refreshPath), 0);
});
