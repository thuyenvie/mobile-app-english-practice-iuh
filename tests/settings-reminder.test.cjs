const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text, button, plain, tick } = require("./helpers/guest-runtime.cjs");
const plan = (extra = {}) => ({ id: 1, targetScore: 750, currentScore: 500, targetDate: "2027-01-01", dailyMinutes: 35,
 timezone: "Asia/Ho_Chi_Minh", reminderDays: [1,3,5], reminderEnabled: true, reminderTime: "20:00:00",
 quietStart: "22:00:00", quietEnd: "07:00:00", updatedAt: "fixture", ...extra });
function fixture(overrides = {}, guest = false) {
 const app = environment(); if (guest) app.session.enterGuestSession(); else app.session.authenticateSession("self");
 const calls = [];
 const deps = { load: async () => { calls.push("get"); return plan(); },
  patch: async input => { calls.push(["patch", plain(input)]); return plan(input); },
  register: async generation => { calls.push(["register", generation]); return "registered"; }, ...overrides };
 const create = () => app.load("features/settings/reminder/reminderController.ts").createReminderController(app.session.getSessionSnapshot(), deps);
 return { app, calls, deps, create, controller: create() };
}
test("Guest controller and UI issue zero private or permission requests; login CTA works", async () => {
 const f = fixture({}, true); await f.controller.load(); await f.controller.save(); await f.controller.register(); assert.deepEqual(f.calls, []);
 const app = environment({ "../../notifications/api/pushNotificationApi": { registerStudyPushToken: () => { throw Error("Guest permission"); } } });
 app.session.enterGuestSession(); const Entry = app.load("features/settings/entries/SET03Entry.tsx").SET03Entry;
 const theme = app.load("src/theme/palettes.ts").getAppTheme("dark").settingsTheme;
 const tree = app.hooks.render(Entry, { authenticated: false, theme }); await app.hooks.flush();
 button(tree, "Đăng nhập để cài nhắc học").props.onPress(); assert.deepEqual(app.routerCalls, [["push", "/auth/login"]]);
 assert.equal(app.requests.length, 0); app.hooks.dispose();
});
test("canonical HH:mm:ss renders as HH:mm; days/timezone and learning data survive four-field save", async () => {
 const f = fixture(); await f.controller.load(); assert.equal(f.controller.getSnapshot().draft.reminderTime, "20:00");
 f.controller.edit({ reminderEnabled: false }); await f.controller.save();
 assert.deepEqual(f.calls, ["get", ["patch", { reminderEnabled: false, reminderTime: "20:00", quietStart: "22:00", quietEnd: "07:00" }]]);
 assert.equal(f.controller.getSnapshot().saved, true);
 const p = f.controller.getSnapshot().plan; assert.deepEqual(plain(p.reminderDays), [1,3,5]); assert.equal(p.timezone, "Asia/Ho_Chi_Minh");
 assert.equal(p.targetScore, 750); assert.equal(p.dailyMinutes, 35); assert.equal(f.calls.some(x => x[0] === "register"), false);
});
test("saving never requests permission automatically; explicit registration is separate", async () => {
 const f = fixture({ load: async () => plan({ reminderEnabled: false }) }); await f.controller.load();
 f.controller.edit({ reminderEnabled: true }); await f.controller.save(); assert.equal(f.calls.length, 1);
 await f.controller.register(); assert.equal(f.controller.getSnapshot().device, "registered"); assert.equal(f.calls[1][0], "register");
});
test("network save failure keeps draft, no premature success, retry gets canonical response", async () => {
 let resolve, fail = true; const f = fixture({ patch: () => new Promise(r => { resolve = r; }) }); await f.controller.load();
 f.controller.edit({ reminderTime: "06:35" }); const pending = f.controller.save(); assert.equal(f.controller.getSnapshot().busy, true);
 assert.equal(f.controller.getSnapshot().saved, false); f.controller.edit({ reminderTime: "09:00" });
 resolve(plan({ reminderTime: "06:35:00" })); await pending; assert.equal(f.controller.getSnapshot().draft.reminderTime, "06:35");
 f.deps.patch = async () => { if (fail) throw Error("offline"); return plan({ reminderTime: "08:15:00" }); };
 f.controller.edit({ reminderTime: "08:15" }); await f.controller.save(); assert.equal(f.controller.getSnapshot().saved, false);
 assert.equal(f.controller.getSnapshot().draft.reminderTime, "08:15"); assert.match(f.controller.getSnapshot().error, /thử lại/);
 fail = false; await f.controller.save(); assert.equal(f.controller.getSnapshot().saved, true);
});
test("load offline/error/retry and no-plan state are explicit", async () => {
 let fail = true; const f = fixture({ load: async () => { if(fail) throw Error("offline"); return null; } });
 await f.controller.load(); assert.equal(f.controller.getSnapshot().phase, "error");
 fail = false; await f.controller.load(); assert.equal(f.controller.getSnapshot().phase, "missing");
 await f.controller.save(); assert.deepEqual(f.calls, []);
});
test("409 PLAN_REQUIRED after load switches to setup CTA state", async () => {
 const f = fixture({ patch: async () => { throw { response: { status:409, data:{code:3208} } }; } });
 await f.controller.load(); await f.controller.save(); assert.equal(f.controller.getSnapshot().phase, "missing"); assert.equal(f.controller.getSnapshot().plan, null);
});
for (const draft of [{reminderTime:"24:00"},{reminderTime:"9:00"},{quietStart:""},{quietEnd:"07:99"},{reminderTime:""}])
 test("invalid draft blocks PATCH " + JSON.stringify(draft), async () => {
  const f = fixture(); await f.controller.load(); f.controller.edit(draft); await f.controller.save();
  assert.deepEqual(f.calls, ["get"]); assert.match(f.controller.getSnapshot().error, /HH:mm/);
 });
test("clearing quiet pair sends two explicit nulls; OFF preserves daily time", async () => {
 const f = fixture(); await f.controller.load(); f.controller.edit({ quietStart:"", quietEnd:"", reminderEnabled:false }); await f.controller.save();
 assert.deepEqual(f.calls[1][1], {reminderEnabled:false, reminderTime:"20:00", quietStart:null, quietEnd:null});
 await f.controller.register(); assert.equal(f.calls.length, 2);
});
for (const result of ["permission-denied", "unsupported", "error"]) test("remote saved remains distinct from device " + result, async () => {
 const f = fixture({ register: async () => { if(result === "error") throw Error("offline"); return result; } });
 await f.controller.load(); await f.controller.save(); await f.controller.register();
 assert.equal(f.controller.getSnapshot().saved, true); assert.equal(f.controller.getSnapshot().device, result);
});
for (const operation of ["load", "save", "register"]) test("old " + operation + " completion cannot cross owner/generation", async () => {
 let resolve; const f = fixture(); if(operation !== "load") await f.controller.load();
 f.deps[operation === "save" ? "patch" : operation] = () => new Promise(r => { resolve = r; });
 const pending = f.controller[operation](); const before = f.controller.getSnapshot();
 f.app.session.enterGuestSession(); f.app.session.authenticateSession("other");
 resolve(operation === "register" ? "registered" : plan()); await pending;
 assert.equal(f.controller.getSnapshot(), before); await f.controller.save(); await f.controller.register();
 const next = f.create(); assert.equal(next.getSnapshot().plan, null); assert.equal(next.getSnapshot().device, "unregistered");
});
test("explicit device retry recovers without resaving remote plan; legacy conflict stays visible",async()=>{
 let fail=true; const f=fixture({register:async()=>{if(fail) throw Error("offline"); return "registered";}});
 await f.controller.load(); await f.controller.save(); await f.controller.register();
 assert.equal(f.controller.getSnapshot().device,"error"); fail=false; await f.controller.register();
 assert.equal(f.controller.getSnapshot().device,"registered"); assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==="patch").length,1);
 f.deps.patch=async()=>{throw {response:{status:409,data:{code:3209}}};};
 f.controller.edit({reminderTime:"08:00"}); await f.controller.save();
 assert.match(f.controller.getSnapshot().error,/không hợp lệ/); assert.equal(f.controller.getSnapshot().draft.reminderTime,"08:00");
});
test("refresh is serialized with save, stale refresh error is discarded after logout", async () => {
 let reject; const f = fixture(); await f.controller.load(); f.deps.load = () => new Promise((_r,j) => { reject=j; });
 const pending = f.controller.load(); await f.controller.save(); assert.deepEqual(f.calls,["get"]);
 const before = f.controller.getSnapshot(); f.app.session.enterGuestSession(); reject(Error("late offline")); await pending;
 assert.equal(f.controller.getSnapshot(), before);
});
test("real API adapter whitelists four fields, uses PATCH only and guards Guest/stale response", async () => {
 const app = environment(); const api = app.load("features/study/api/studyPlanApi.ts"); app.session.enterGuestSession();
 await assert.rejects(api.updateStudyReminder(plan())); assert.equal(app.requests.length,0);
 app.session.authenticateSession("self"); app.handler = async () => ({ code:1000, result:plan() });
 await api.updateStudyReminder(plan()); assert.equal(app.requests[0].method,"patch"); assert.equal(app.requests[0].url,"/exam-service/study-plans/me/reminder");
 assert.deepEqual(Object.keys(JSON.parse(app.requests[0].data)).sort(),["quietEnd","quietStart","reminderEnabled","reminderTime"]);
 let resolve; app.handler = () => new Promise(r => { resolve=r; }); const pending = api.updateStudyReminder(plan()); await tick();
 app.session.authenticateSession("other"); resolve({code:1000,result:plan()}); await assert.rejects(pending,/Phiên/);
});
test("GET captures owner generation before Axios microtasks and rejects stale refresh", async () => {
 const app = environment(); app.session.authenticateSession("self"); const api = app.load("features/study/api/studyPlanApi.ts");
 const generation = app.session.getSessionSnapshot().generation;
 const beforeDispatch = api.getStudyPlan(generation); app.session.authenticateSession("other");
 await assert.rejects(beforeDispatch,/Phiên/); assert.equal(app.requests.length,0);
 let resolve; app.handler=()=>new Promise(r=>{resolve=r;});
 const afterDispatch = api.getStudyPlan(app.session.getSessionSnapshot().generation); await tick();
 app.session.enterGuestSession(); resolve({code:1000,result:plan()}); await assert.rejects(afterDispatch,/Phiên/);
});
test("inline editor renders read-only days/timezone and setup CTA, disables edits while saving", async () => {
 const app = environment({ "../../notifications/api/pushNotificationApi": { registerStudyPushToken: async () => "unsupported" } });
 app.session.authenticateSession("self"); app.handler = async () => ({code:1000,result:plan()});
 const Entry = app.load("features/settings/entries/SET03Entry.tsx").SET03Entry;
 const theme = app.load("src/theme/palettes.ts").getAppTheme("light").settingsTheme;
 const render = () => app.hooks.render(Entry,{ authenticated:true,theme }); render(); await app.hooks.flush();
 let tree=render(); assert.match(text(tree),/T2, T4, T6/);
 assert.equal(nodes(tree).filter(n=>n.type === "TextInput").length,0);
 button(tree,"Chi tiết nhắc học").props.onPress(); tree=render(); assert.match(text(tree),/Asia\/Ho_Chi_Minh/);
 button(tree,"Chỉnh sửa nhắc học").props.onPress(); tree=render();
 assert.deepEqual(nodes(tree).filter(n=>n.type === "TextInput").map(n=>n.props.accessibilityLabel),["Giờ nhắc học","Yên lặng từ","Yên lặng đến"]);
 let resolve; app.handler=()=>new Promise(r=>{resolve=r;}); button(tree,"Lưu nhắc học").props.onPress(); await tick(); tree=render();
 assert.ok(nodes(tree).filter(n=>n.type === "TextInput").every(n=>n.props.editable===false)); assert.match(text(tree),/Đang xử lý/);
 resolve({code:1000,result:plan()}); await app.hooks.flush();
 app.handler=async()=>({code:1000,result:null}); button(render(),"Kiểm tra lại lịch nhắc").props.onPress(); await app.hooks.flush();
 tree=render(); button(tree,"Tạo kế hoạch học").props.onPress(); assert.deepEqual(app.routerCalls,[["push","/study-plan/setup"]]);
 app.session.enterGuestSession(); assert.equal(nodes(render()).filter(n=>n.type === "TextInput").length,0); app.hooks.dispose();
});
function nativeFixture(notifications = {}) {
 const app = environment({ "expo-constants": { expoConfig:{extra:{eas:{projectId:"fixture"}}} },
  "expo-notifications": { AndroidImportance:{HIGH:4}, setNotificationChannelAsync:async()=>{},
   getPermissionsAsync:async()=>({status:"granted"}), requestPermissionsAsync:async()=>({status:"granted"}),
   getExpoPushTokenAsync:async()=>({data:"fixture-device"}), ...notifications } });
 app.session.authenticateSession("self"); return { app, api:app.load("features/notifications/api/pushNotificationApi.native.ts") };
}
test("clear button copy keeps permission explicit, refresh GET-only, and saved time distinct from draft",async()=>{
 let registrations=0;
 const app=environment({"../../notifications/api/pushNotificationApi":{registerStudyPushToken:async()=>{registrations++;return "registered";}}});
 app.session.authenticateSession("self");app.handler=async()=>({code:1000,result:plan()});
 const Entry=app.load("features/settings/entries/SET03Entry.tsx").SET03Entry;
 const theme=app.load("src/theme/palettes.ts").getAppTheme("light").settingsTheme;
 const render=()=>app.hooks.render(Entry,{authenticated:true,theme});render();await app.hooks.flush();let tree=render();
 assert.match(text(tree),/Chưa kiểm tra quyền/);assert.match(text(tree),/Giờ nhắc đã lưu: 20:00/);
 button(tree,"Chi tiết nhắc học").props.onPress(); tree=render();
 assert.match(text(tree),/không gửi thông báo thử/);assert.match(text(tree),/đăng ký máy này cho tài khoản/);
 assert.ok(button(tree,"Cho phép nhận thông báo"));assert.ok(button(tree,"Kiểm tra lại lịch nhắc"));
 assert.equal(registrations,0);assert.equal(app.requests.length,1);
 button(tree,"Chỉnh sửa nhắc học").props.onPress(); tree=render();
 nodes(tree).find(n=>n.type==="TextInput"&&n.props.accessibilityLabel==="Giờ nhắc học").props.onChangeText("18:20");
 tree=render();assert.match(text(tree),/Giờ nhắc đã lưu: 20:00/);
 assert.equal(nodes(tree).find(n=>n.type==="TextInput"&&n.props.accessibilityLabel==="Giờ nhắc học").props.value,"18:20");
 app.handler=async()=>({code:1000,result:plan({reminderTime:"18:12:00"})});
 button(tree,"Kiểm tra lại lịch nhắc").props.onPress();await app.hooks.flush();tree=render();
 assert.match(text(tree),/Giờ nhắc đã lưu: 18:12/);assert.equal(registrations,0);
 assert.equal(app.requests.length,2);assert.ok(app.requests.every(r=>r.method==="get"&&r.url==="/exam-service/study-plans/me"));
 button(tree,"Cho phép nhận thông báo").props.onPress();await app.hooks.flush();tree=render();
 assert.equal(registrations,1);assert.equal(app.requests.length,2);assert.match(text(tree),/chưa xác nhận thông báo đã được giao/);
 app.hooks.dispose();
});
test("native explicit denied does not deactivate token or cancel vocabulary notifications", async () => {
 const {app,api}=nativeFixture({getPermissionsAsync:async()=>({status:"denied"}),requestPermissionsAsync:async()=>({status:"denied"})});
 app.local.set("expo_push_token_current_device","existing-fixture");
 assert.equal(await api.registerStudyPushToken({generation:app.session.getSessionSnapshot().generation,preserveTokenOnDenied:true}),"permission-denied");
 assert.equal(app.requests.length,0); assert.equal(app.local.get("expo_push_token_current_device"),"existing-fixture");
});
for(const scoped of [false,true])test("native registration preserves existing setup path and explicit Settings path, scoped="+scoped,async()=>{
 const {app,api}=nativeFixture();app.handler=async()=>({code:1000,result:{}});
 const generation=app.session.getSessionSnapshot().generation;
 assert.equal(await api.registerStudyPushToken(scoped?{generation,preserveTokenOnDenied:true}:undefined),"registered");
 assert.equal(app.requests.length,1);assert.equal(app.requests[0].method,"put");
 assert.equal(app.requests[0].url,"/notification-service/push-tokens/me");
 assert.deepEqual(JSON.parse(app.requests[0].data),{expoPushToken:"fixture-device",platform:"ANDROID"});
 assert.equal(app.requests[0].sessionGeneration,generation);assert.equal(app.local.get("expo_push_token_current_device"),"fixture-device");
});
test("native delayed permission on old account cannot register token for new account", async () => {
 let resolve; const {app,api}=nativeFixture({getPermissionsAsync:()=>new Promise(r=>{resolve=r;})});
 const pending=api.registerStudyPushToken({generation:app.session.getSessionSnapshot().generation,preserveTokenOnDenied:true}); await tick();
 app.session.authenticateSession("other"); resolve({status:"granted"}); await assert.rejects(pending,/Phiên/); assert.equal(app.requests.length,0);
});
test("native delayed token retrieval on old account cannot PUT under new credentials",async()=>{
 let resolve; const {app,api}=nativeFixture({getExpoPushTokenAsync:()=>new Promise(r=>{resolve=r;})});
 const pending=api.registerStudyPushToken({generation:app.session.getSessionSnapshot().generation,preserveTokenOnDenied:true}); await tick();
 app.session.enterGuestSession(); app.session.authenticateSession("other"); resolve({data:"old-fixture"});
 await assert.rejects(pending,/Phiên/); assert.equal(app.requests.length,0); assert.equal(app.local.size,0);
});
test("web registration is unsupported and sends no private request",async()=>{
 const app=environment(); assert.equal(await app.load("features/notifications/api/pushNotificationApi.web.ts").registerStudyPushToken(),"unsupported");
 assert.equal(app.requests.length,0);
});
