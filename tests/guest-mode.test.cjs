const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { Buffer } = require("node:buffer");
const { environment, tick, plain, nodes, text, button } = require("./helpers/guest-runtime.cjs");

const token = subject => "header." + Buffer.from(JSON.stringify({ sub: subject })).toString("base64url") + ".signature";
const result = (section = "READING") => ({
  year: 2026, testNumber: 1, section, partNumber: section === "READING" ? 5 : null,
  score: 1, totalQuestions: section === "READING" ? 30 : 100, answeredQuestions: 1,
  startedAt: "2026-10-24T06:00:00Z", submittedAt: "2026-10-24T06:01:00Z",
  answers: [{ questionNumber: section === "READING" ? 101 : 1, selectedOption: "A", correct: true, correctOption: "A" }],
});

test("startup without credentials becomes Guest and never requests profile", async () => {
  const app = environment();
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.requests.length, 0);
  const years = plain(app.load("features/study/data/toeicCatalog.ts").toeicYears);
  app.handler = async config => {
    assert.equal(config.method, "get");
    assert.match(config.url, /^\/exam-service\/exams\/ets-[0-9]+$/);
    assert.equal(config.headers.get("Authorization"), undefined);
    return { code: 1000, result: [1] };
  };
  const home = await app.load("features/home/data/homeDataSource.ts").loadHomeData("guest");
  assert.ok(home.sections.length > 0);
  assert.equal(home.sections.length, years.length);
  assert.deepEqual(app.requests.map(request => request.url).sort(),
    years.map(year => `/exam-service/exams/ets-${year}`).sort());
  assert.equal(app.requests.some(request => request.url.startsWith("/identity/")), false);
  const entry = app.load("src/app/index.tsx").default();
  assert.equal(entry.props.href, "/(tabs)/home");
});

test("stored valid session is verified before entering authenticated Home", async () => {
  const app = environment();
  app.secure.set("access_token", token("alice")); app.secure.set("refresh_token", "refresh-alice");
  app.handler = async config => {
    assert.equal(config.url, "/identity/user/my-info");
    return { success: true, result: { userName: "alice" } };
  };
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.session.getSessionSnapshot().subject, "alice");
  assert.equal(app.requests[0].headers.get("Authorization"), "Bearer " + token("alice"));
});

for (const status of [0, 408, 429, 503]) {
  test("temporary verification failure preserves credentials and loading, status " + status, async () => {
    const app = environment(), access = token("alice");
    app.secure.set("access_token", access); app.secure.set("refresh_token", "refresh-alice");
    app.handler = async config => {
      if (status === 0) throw new axios.AxiosError("Offline", "ERR_NETWORK", config);
      return app.fail(config, status);
    };
    const restore = app.load("src/lib/auth/restoreSession.ts").restoreSession;
    await restore();
    assert.equal(app.session.getSessionSnapshot().status, "loading");
    assert.ok(app.session.getSessionSnapshot().error);
    assert.equal(app.secure.get("access_token"), access);
    assert.equal(app.secure.get("refresh_token"), "refresh-alice");
    app.handler = async () => ({ success: true, result: { userName: "alice" } });
    await restore();
    assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  });
}

test("expired access token rotates credentials and restores account", async () => {
  const app = environment();
  app.secure.set("access_token", "expired"); app.secure.set("refresh_token", "refresh-old");
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") {
      return { success: true, result: { success: true, token: token("alice"), refreshToken: "refresh-new" } };
    }
    if (config.headers.get("Authorization") === "Bearer expired") return app.fail(config);
    return { success: true, result: { userName: "alice" } };
  };
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
  assert.equal(app.secure.get("refresh_token"), "refresh-new");
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 1);
});

test("refresh-only stored session can restore when access token is missing", async () => {
  const app = environment();
  app.secure.set("refresh_token", "refresh-old");
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return { success: true, result: { success: true, token: token("alice"), refreshToken: "new" } };
    if (!config.headers.get("Authorization")) return app.fail(config);
    return { success: true, result: { userName: "alice" } };
  };
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().subject, "alice");
});

test("invalid refresh ends local session as Guest without navigating to Login", async () => {
  const app = environment();
  app.secure.set("access_token", "expired"); app.secure.set("refresh_token", "invalid");
  app.handler = async config => app.fail(config);
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().status, "guest");
  assert.equal(app.secure.size, 0);
  assert.deepEqual(app.routerCalls, []);
});

test("refresh outage preserves the User credentials", async () => {
  const app = environment();
  app.secure.set("access_token", "expired"); app.secure.set("refresh_token", "refresh-old");
  app.handler = async config => app.fail(config, config.url === "/identity/auth/refresh" ? 503 : 401);
  await app.load("src/lib/auth/restoreSession.ts").restoreSession();
  assert.equal(app.session.getSessionSnapshot().status, "loading");
  assert.equal(app.secure.get("refresh_token"), "refresh-old");
  assert.equal(app.secure.get("access_token"), "expired");
});

test("public practice sends no credentials, even with stale account tokens in storage", async () => {
  const app = environment();
  app.secure.set("access_token", token("old-account")); app.secure.set("refresh_token", "old-refresh");
  app.session.enterGuestSession();
  const exam = app.load("features/study/api/examApi.ts");
  const audio = app.load("features/study/api/listeningApi.ts");
  const practice = app.load("features/study/api/practiceApi.ts");
  app.handler = async config => {
    if (config.url.includes("/submit")) return { result: result(config.url.includes("listening") ? "LISTENING" : "READING") };
    if (config.url.endsWith("/parts/5")) return { result: { questions: [], passages: [] } };
    return { result: [1, 2] };
  };
  assert.deepEqual(plain(await exam.getTestNumbersByYear(2026)), [1, 2]);
  await exam.getExamPart(2026, 1, 5);
  await audio.getListeningAudio(2026, 1);
  await audio.getQuestionAudio(2026, 1, 1);
  const generation = app.session.getSessionSnapshot().generation;
  const reading = await practice.submitReadingPractice(generation, 2026, 1, 5, {101:"A"}, result().startedAt);
  const listening = await practice.submitListeningPractice(generation, 2026, 1, {1:"A"}, result().startedAt);
  assert.equal(reading.score, 1); assert.equal(listening.score, 1);
  assert.equal("resultId" in reading, false); assert.equal("userId" in listening, false);
  for (const request of app.requests) assert.equal(request.headers.get("Authorization"), undefined);
  assert.equal(app.requests.filter(r => r.url.includes("auth/refresh")).length, 0);
  assert.ok(app.requests.some(r => r.url === "/exam-service/exams/guest/2026/1/reading/parts/5/submit"));
  assert.ok(app.requests.some(r => r.url === "/exam-service/exams/guest/2026/1/listening/submit"));
  assert.deepEqual(app.storageCalls, []);
});

for (const status of [401, 403]) {
  test("Guest public " + status + " never refreshes or redirects", async () => {
    const app = environment(); app.session.enterGuestSession();
    app.handler = async config => app.fail(config, status);
    const client = app.load("src/lib/axios/axios.ts");
    await assert.rejects(client.publicApi.get("/exam-service/exams/ets-2026"));
    assert.equal(app.session.getSessionSnapshot().status, "guest");
    assert.equal(app.requests.length, 1); assert.deepEqual(app.routerCalls, []);
    assert.deepEqual(app.storageCalls, []);
  });
}

test("Guest cannot issue private account requests", async () => {
  const app = environment(); app.session.enterGuestSession();
  const client = app.load("src/lib/axios/axios.ts").default;
  for (const uri of ["/identity/user/my-info", "/exam-service/exams/results", "/exam-service/chat/conversations"]) {
    await assert.rejects(client.get(uri), /đăng nhập/);
  }
  assert.equal(app.requests.length, 0);
});

test("User practice still calls original authenticated submit endpoints", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  app.secure.set("access_token", token("alice"));
  app.handler = async config => ({ result: { ...result(config.url.includes("listening") ? "LISTENING" : "READING"), resultId: 42, userId: "alice" } });
  const practice = app.load("features/study/api/practiceApi.ts");
  const generation = app.session.getSessionSnapshot().generation;
  assert.equal((await practice.submitReadingPractice(generation, 2026, 1, 5, {101:"A"}, result().startedAt)).resultId, 42);
  assert.equal((await practice.submitListeningPractice(generation, 2026, 1, {1:"A"}, result().startedAt)).resultId, 42);
  assert.equal(app.requests.length, 2);
  for (const request of app.requests) {
    assert.equal(request.url.includes("/guest/"), false);
    assert.equal(request.headers.get("Authorization"), "Bearer " + token("alice"));
  }
});

test("an old Guest attempt cannot be submitted into the newly authenticated account", async () => {
  const app = environment(); app.session.enterGuestSession();
  const oldGeneration = app.session.getSessionSnapshot().generation;
  app.session.authenticateSession("alice");
  const practice = app.load("features/study/api/practiceApi.ts");
  await assert.rejects(practice.submitReadingPractice(oldGeneration, 2026, 1, 5, {101:"A"}, result().startedAt), { name: "SessionChangedError" });
  assert.equal(app.requests.length, 0);
});

test("late account response is rejected after switching identity", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  app.secure.set("access_token", token("alice"));
  let release;
  app.handler = () => new Promise(resolve => { release = resolve; });
  const request = app.load("src/lib/axios/axios.ts").default.get("/exam-service/exams/results");
  const rejection = assert.rejects(request, { name: "SessionChangedError" });
  await tick(); app.session.authenticateSession("bob");
  release({ result: [{ userId: "alice" }] });
  await rejection;
});

test("late refresh cannot overwrite credentials saved by a new login", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  app.secure.set("access_token", "expired"); app.secure.set("refresh_token", "alice-refresh");
  let releaseRefresh;
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") return new Promise(resolve => { releaseRefresh = resolve; });
    if (config.url === "/identity/auth/login") return { success: true, result: { success: true, token: token("bob"), refreshToken: "bob-refresh" } };
    return app.fail(config);
  };
  const request = app.load("src/lib/axios/axios.ts").default.get("/exam-service/exams/results");
  const rejection = assert.rejects(request, { name: "SessionChangedError" });
  for (let i=0; i<8 && !releaseRefresh; i++) await tick();
  await app.load("features/auth/api/authApi.ts").login({ userName: "bob", passWord: "test-password" });
  releaseRefresh({ success: true, result: { success: true, token: token("alice"), refreshToken: "late-alice" } });
  await rejection;
  assert.equal(app.secure.get("access_token"), token("bob"));
  assert.equal(app.secure.get("refresh_token"), "bob-refresh");
  assert.equal(app.session.getSessionSnapshot().subject, "bob");
});

test("concurrent 401 requests share one refresh", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  app.secure.set("access_token", "expired"); app.secure.set("refresh_token", "old");
  app.handler = async config => {
    if (config.url === "/identity/auth/refresh") {
      await tick();
      return { success: true, result: { success: true, token: token("alice"), refreshToken: "new" } };
    }
    if (config.headers.get("Authorization") === "Bearer expired") return app.fail(config);
    return { result: [] };
  };
  const client = app.load("src/lib/axios/axios.ts").default;
  await Promise.all([client.get("/exam-service/exams/results"), client.get("/exam-service/chat/conversations")]);
  assert.equal(app.requests.filter(r => r.url === "/identity/auth/refresh").length, 1);
});

test("Guest Listening answers stay in RAM and vanish on a fresh attempt", async () => {
  const app = environment(); app.session.enterGuestSession();
  const hook = app.load("features/study/hooks/useListeningDraft.ts").useListeningDraft;
  app.hooks.render(() => hook(2026, 1, 1)); await app.hooks.flush();
  assert.equal(app.hooks.output.ready, true);
  app.hooks.output.select(1, "A"); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {1:"A"});
  assert.deepEqual(app.storageCalls, []);
  app.hooks.dispose();
  app.hooks.render(() => hook(2026, 1, 1)); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {});
  assert.deepEqual(app.storageCalls, []);
});

test("User Listening draft migrates legacy answers to a separate account and Part key", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  app.local.set("listening:v1:alice:2026:1", JSON.stringify({ answers: {1:"B"}, startedAt: "2026-01-01T00:00:00Z" }));
  const hook = app.load("features/study/hooks/useListeningDraft.ts").useListeningDraft;
  app.hooks.render(() => hook(2026, 1, 1)); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {1:"B"});
  app.hooks.output.select(2, "A"); await app.hooks.flush();
  assert.deepEqual(JSON.parse(app.local.get("listening:v1:alice:2026:1:part:1")).answers, {1:"B",2:"A"});
  app.hooks.dispose(); app.session.authenticateSession("bob");
  app.hooks.render(() => hook(2026, 1, 1)); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {});
  assert.ok(app.storageCalls.some(([kind,key]) => kind==="local:get" && key==="listening:v1:bob:2026:1"));
});

test("practice route unmounts Guest content on blur, retaining User behavior", () => {
  const app = environment({
    "../../../../../../features/study/screens/ReadingPartScreen": { __esModule: true, default: "Reading" },
    "../../../../../../features/study/screens/ListeningPartScreen": { __esModule: true, default: "Listening" },
  });
  app.session.enterGuestSession();
  app.params = {year:"2026",testNumber:"1",partNumber:"5"};
  const route = app.load("src/app/study/[year]/[testNumber]/parts/[partNumber].tsx").default;
  assert.equal(route().type, "Reading");
  app.focused = false; assert.equal(route(), null);
  app.session.authenticateSession("alice"); assert.equal(route().type, "Reading");
});

test("dirty Guest login requires confirmation; cancel preserves practice", () => {
  const app = environment(); app.session.enterGuestSession();
  const Notice = app.load("features/study/components/GuestPracticeNotice.tsx").GuestPracticeNotice;
  app.hooks.render(Notice, {hasAnswers:true});
  button(app.hooks.output, "Đăng nhập để lưu").props.onPress(); app.hooks.render();
  assert.equal(nodes(app.hooks.output).find(n=>n.type==="Modal").props.visible, true);
  assert.deepEqual(app.routerCalls, []);
  button(app.hooks.output, "Tiếp tục làm bài").props.onPress(); app.hooks.render();
  assert.equal(nodes(app.hooks.output).find(n=>n.type==="Modal").props.visible, false);
  assert.deepEqual(app.routerCalls, []);
  button(app.hooks.output, "Đăng nhập để lưu").props.onPress(); app.hooks.render();
  button(app.hooks.output, "Hủy bài và đăng nhập").props.onPress();
  assert.deepEqual(app.routerCalls, [["replace","/auth/login"]]);
});

test("empty Guest attempt can go to Login directly", () => {
  const app = environment(); app.session.enterGuestSession();
  const Notice = app.load("features/study/components/GuestPracticeNotice.tsx").GuestPracticeNotice;
  app.hooks.render(Notice, {hasAnswers:false});
  button(app.hooks.output, "Đăng nhập để lưu").props.onPress();
  assert.deepEqual(app.routerCalls, [["replace","/auth/login"]]);
});

test("private route gate does not mount account children for Guest or loading", () => {
  const app = environment();
  const Gate = app.load("src/components/auth/RequireAccount.tsx").RequireAccount;
  const privateChild = {type:"AccountData"};
  assert.notEqual(Gate({children:privateChild}), privateChild);
  app.session.enterGuestSession();
  assert.ok(text(Gate({children:privateChild})).includes("yêu cầu đăng nhập"));
  app.session.authenticateSession("alice");
  assert.equal(Gate({children:privateChild}), privateChild);
});

for (const [route,screen] of [
  ["src/app/(tabs)/ai.tsx","../../../features/ai/screens/AiTutorScreen"],
  ["src/app/ai-history.tsx","../../features/ai/screens/AiHistoryScreen"],
  ["src/app/study/history/index.tsx","../../../../features/study/screens/ListeningHistoryScreen"],
  ["src/app/study/history/[resultId].tsx","../../../../features/study/screens/ListeningReviewScreen"],
]) {
  test("deep-linked route mounts account gate first: " + route, () => {
    const app = environment({[screen]: {__esModule:true,default:"AccountScreen"}});
    app.session.enterGuestSession();
    const node = app.load(route).default();
    const guarded = node.type(node.props);
    assert.ok(text(guarded).includes("yêu cầu đăng nhập"));
    assert.equal(nodes(guarded).some(n=>n.type==="AccountScreen"),false);
    assert.equal(app.requests.length,0);
  });
}

test("Guest Home shows login CTA, User Home keeps its greeting without CTA", () => {
  const app = environment(); app.session.enterGuestSession();
  const Header = app.load("features/home/components/HomeHeader.tsx").HomeHeader;
  const props = {profile:{fullName:"Alice"}, welcomeText:"Hello"};
  app.hooks.render(Header,props);
  assert.ok(text(app.hooks.output).includes("Đăng nhập để bắt đầu học"));
  app.session.authenticateSession("alice"); app.hooks.render();
  assert.equal(text(app.hooks.output).includes("Đăng nhập để bắt đầu học"),false);
  assert.ok(text(app.hooks.output).includes("Chào mừng quay lại Alice!"));
});

test("native practice player supplies a public URI without Authorization", async () => {
  const app = environment(); app.session.enterGuestSession();
  const Player = app.load("features/study/components/PracticeAudioPlayer.tsx").PracticeAudioPlayer;
  app.hooks.render(Player,{audio:{startTime:0,endTime:10,streamPath:"/exams/2026/1/listening/audio/stream"},
    activeQuestionNumber:1,paused:false});
  await app.hooks.flush();
  assert.deepEqual(plain(app.audioSources), [{uri:"http://10.0.2.2:9999/api/exam-service/exams/2026/1/listening/audio/stream"}]);
  assert.deepEqual(app.storageCalls,[]);
  app.hooks.dispose();
});

test("AI image cache is isolated per account and never read by Guest", async () => {
  const app = environment(); app.session.authenticateSession("alice");
  const images = app.load("features/ai/storage/localImageStorage.ts");
  await images.saveLocalQuestionImage("request-1",{uri:"file:///picked.jpg",mimeType:"image/jpeg"});
  assert.ok((await images.getLocalQuestionImages(["request-1"]))["request-1"]);
  app.session.authenticateSession("bob");
  assert.deepEqual(plain(await images.getLocalQuestionImages(["request-1"])),{});
  app.session.enterGuestSession();
  const before = app.storageCalls.length;
  await assert.rejects(images.getLocalQuestionImages(["request-1"]),/đăng nhập/);
  assert.equal(app.storageCalls.length,before);
});


test("session boundary creates a new screen tree for each identity", () => {
  const app = environment({ "@/lib/auth/restoreSession": {restoreSession: async () => {}} });
  const Provider = app.load("src/providers/SessionProvider.tsx").SessionProvider;
  app.hooks.render(Provider,{children:{type:"Screens"}});
  assert.match(app.hooks.output.props.message, /Đang kiểm tra phiên/);
  app.session.enterGuestSession(); app.hooks.render();
  const guestKey = app.hooks.output.key;
  app.session.authenticateSession("alice"); app.hooks.render();
  const aliceKey = app.hooks.output.key;
  assert.notEqual(guestKey, aliceKey);
  app.session.authenticateSession("bob"); app.hooks.render();
  assert.notEqual(app.hooks.output.key, aliceKey);
});

for (const mode of ["guest", "authenticated"]) {
  test("actual Reading screen selects, submits and presents " + mode + " result", async () => {
    const part = {year:2026,testNumber:1,partNumber:5,passages:[],
      questions:[{id:1,questionNumber:101,content:"A question",passageId:null,options:[{label:"A",text:"Answer A"}]}]};
    const app = environment({
      "../hooks/useExamPart": {useExamPart: () => ({state:{status:"ready",part},retry(){}})},
      "../hooks/useReadingTimer": {useReadingTimer: () => ({label:"25:00",expired:false})},
    });
    if (mode === "guest") app.session.enterGuestSession();
    else { app.session.authenticateSession("alice"); app.secure.set("access_token",token("alice")); }
    app.params = {year:"2026",testNumber:"1",partNumber:"5"};
    app.handler = async () => ({result: mode==="guest" ? result() : {...result(),resultId:42,userId:"alice"}});
    const screen = app.load("features/study/screens/ReadingPartScreen.tsx").default();
    app.hooks.render(screen.type,screen.props);
    await app.hooks.flush();
    nodes(app.hooks.output).find(n=>n.props?.question?.questionNumber===101 && n.props.onSelect).props.onSelect("A");
    app.hooks.render();
    nodes(app.hooks.output).find(n=>typeof n.props?.onSubmit==="function").props.onSubmit();
    app.hooks.render();
    button(app.hooks.output,"Xác nhận nộp").props.onPress();
    await app.hooks.flush();
    assert.ok(text(app.hooks.output).includes("Đúng 1/30"));
    assert.equal(app.requests.filter(r=>r.url.includes("/submit")).length,1);
    assert.equal(app.requests[0].url.includes("/guest/"),mode==="guest");
    if (mode==="guest") {
      const review=nodes(app.hooks.output).find(n=>n.props?.result?.score===1);
      assert.equal("resultId" in review.props.result,false);
      button(app.hooks.output,"Đóng kết quả tạm").props.onPress(); app.hooks.render();
      assert.deepEqual(app.routerCalls,[]);
    } else {
      button(app.hooks.output,"Xem lại bài").props.onPress();
      assert.equal(app.routerCalls[0][1].params.resultId,"42");
    }
  });
}

for (const mode of ["guest", "authenticated"]) {
  test("actual Listening screen selects and submits using " + mode + " API", async () => {
    const part={year:2026,testNumber:1,partNumber:1,passages:[],questions:[
      {id:1,questionNumber:1,options:[{label:"A",text:"A"},{label:"B",text:"B"}]}
    ]};
    const app=environment({"../hooks/useExamPart": {useExamPart:()=>({state:{status:"ready",part},retry(){}})}});
    if(mode==="guest")app.session.enterGuestSession();
    else {app.session.authenticateSession("alice");app.secure.set("access_token",token("alice"));}
    app.params={year:"2026",testNumber:"1",partNumber:"1"};
    app.handler=async()=>({result:mode==="guest"?result("LISTENING"):{...result("LISTENING"),resultId:42,userId:"alice"}});
    const Screen=app.load("features/study/screens/ListeningPartScreen.tsx").default;
    app.hooks.render(Screen);await app.hooks.flush();
    nodes(app.hooks.output).find(n=>n.props?.accessibilityRole==="radio" && n.props.accessibilityLabel==="Câu 1, đáp án A").props.onPress();
    app.hooks.render();
    nodes(app.hooks.output).find(n=>n.props?.text==="Nộp").props.onPress();app.hooks.render();
    assert.ok(text(app.hooks.output).includes("Nộp Listening Part 1?"));
    const submitButtons = nodes(app.hooks.output).filter(n=>n.props?.text==="Nộp");
    submitButtons[submitButtons.length - 1].props.onPress();await app.hooks.flush();
    assert.ok(text(app.hooks.output).includes("Đúng 1/100"));
    assert.equal(app.requests.filter(r=>r.url.includes("/submit")).length,1);
    assert.equal(app.requests[0].url.includes("/guest/"),mode==="guest");
    if(mode==="guest"){
      assert.equal(nodes(app.hooks.output).some(n=>n.props?.text==="Xem lại bài"),false);
      assert.equal(app.storageCalls.filter(([kind])=>kind.startsWith("local:")).length,0);
    }else{
      nodes(app.hooks.output).find(n=>n.props?.text==="Xem lại bài").props.onPress();
      assert.equal(app.routerCalls[0][1].params.resultId,"42");
    }
  });
}


test("Guest can switch Listening Parts without mixing answers or persistent storage", async () => {
  const app = environment(); app.session.enterGuestSession();
  const hook = app.load("features/study/hooks/useListeningDraft.ts").useListeningDraft;
  let part = 1;
  const render = () => hook(2026, 1, part);
  app.hooks.render(render); await app.hooks.flush();
  app.hooks.output.select(1, "A"); await app.hooks.flush();
  part = 2; app.hooks.render(render); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {});
  app.hooks.output.select(7, "B"); await app.hooks.flush();
  part = 1; app.hooks.render(render); await app.hooks.flush();
  assert.deepEqual(plain(app.hooks.output.answers), {1:"A"});
  assert.deepEqual(app.storageCalls, []);
});

test("Guest submits only selected Listening Part and does not attach JWT", async () => {
  const app = environment(); app.session.enterGuestSession();
  app.handler = async config => {
    assert.equal(config.url, "/exam-service/exams/guest/2026/1/listening/parts/2/submit");
    assert.equal(config.headers.get("Authorization"), undefined);
    assert.deepEqual(JSON.parse(config.data).answers, [{questionNumber:7,selectedOption:"B"}]);
    return {result:{...result("LISTENING"),partNumber:2,totalQuestions:25}};
  };
  const value = await app.load("features/study/api/practiceApi.ts").submitListeningPartPractice(
    app.session.getSessionSnapshot().generation,2026,1,2,{7:"B"},new Date().toISOString());
  assert.equal(value.partNumber,2); assert.equal(value.totalQuestions,25);
});

test("resume list waits for draft writes, scopes by account and opens exact selected Parts", async () => {
  const app = environment();
  const { listExamDrafts, writeExamDraft } = app.load("features/study/utils/examDrafts.ts");
  await writeExamDraft("listening:v1:alice:2026:1", { answers: { 1: "A", 7: "B" } });
  await writeExamDraft("listening:v1:alice:2026:1:part:1", { answers: {} });
  await writeExamDraft("reading:v1:bob:2026:1:5", { answers: { 101: "B" } });
  const reading = "reading:v1:alice:2026:2:5";
  await writeExamDraft(reading, { answers: { 101: "A" } });
  void writeExamDraft("practice-parts:v1:alice:2026:3:1-7", { startedAt: new Date().toISOString(), answers: {} });
  const drafts = await listExamDrafts("alice");
  assert.equal(drafts.length, 3);
  assert.deepEqual(plain(drafts.find(item => item.label === "Part 1, 7").href.params), { year: "2026", testNumber: "3", parts: "1,7" });
  assert.ok(drafts.some(item => item.label === "Part 2"));
  assert.ok(drafts.some(item => item.key === reading));
  await writeExamDraft(reading, null);
  assert.equal((await listExamDrafts("alice")).length, 2);
});
