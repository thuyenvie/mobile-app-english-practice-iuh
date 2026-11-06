const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, hookRuntime, nodes, text, button } = require("./helpers/guest-runtime.cjs");

function expand(tree) {
 if(Array.isArray(tree)) return tree.map(expand);
 if(!tree || typeof tree!=="object") return tree;
 if(typeof tree.type==="function") return expand(tree.type(tree.props));
 return {...tree,props:{...tree.props,children:expand(tree.props?.children)}};
}
function screenApp(extraMocks = {}) {
 const mounts=[];
 const snapshot={preferences:{schemaVersion:1,themeMode:"system",listeningAutoplay:true},hydration:"ready",persistence:"idle",hydrationError:null,persistenceError:null,recoveredFields:[],updateSettings:async()=>{},retryHydration:async()=>{}};
 const mocks={
  "@/providers/SettingsProvider":{useSettings:()=>snapshot},
  "@/theme/settingsTheme":{settingsTheme:{background:"fixture",surface:"fixture",text:"fixture",muted:"fixture",border:"fixture",accent:"fixture",success:"fixture",warning:"fixture",error:"fixture",selection:"fixture"}},
  "../../home/components/RecentStudyTimeCard":{RecentStudyTimeCard:"RecentStudyTimeCard"},
  "../../notifications/api/pushNotificationApi":{deactivateCurrentPushToken:async()=>{}},
 };
 for(const id of ["04","05","08"]) mocks["../entries/SET"+id+"Entry"]={['SET'+id+'Entry']:()=>{mounts.push(id);return null;}};
 const app=environment({...mocks,...extraMocks}); app.session.enterGuestSession();
 const Screen=app.load("src/app/(tabs)/settings.tsx").default;
 return {app,mounts,render:()=>expand(app.hooks.render(Screen))};
}
test("Guest shell has four groups, login CTA/card, and never mounts private entries",()=>{
 const {app,mounts,render}=screenApp(); const tree=render();
 for(const title of ["Giao diện và học tập","Tài khoản","Dữ liệu và hỗ trợ","Giới thiệu"]) assert.ok(text(tree).includes(title));
 assert.ok(text(tree).includes("Chưa khả dụng")); assert.deepEqual(mounts,[]); assert.equal(app.requests.length,0);
 assert.equal(nodes(tree).find(n=>n.type==="RecentStudyTimeCard").props.authenticated,false);
 button(tree,"Đăng nhập để lưu kết quả").props.onPress(); assert.deepEqual(app.routerCalls,[["push","/auth/login"]]);
 assert.equal(nodes(tree).filter(n=>n.props?.accessibilityState?.disabled).every(n=>!n.props.onPress),true);
});
test("private entries mount only for authenticated sessions, and stop mounting after logout",()=>{
 const {app,mounts,render}=screenApp(); render(); app.session.authenticateSession("fixture-user");
 const tree=render(); assert.deepEqual(mounts,["04","05","08"]); assert.equal(app.requests.length,0);
 assert.equal(nodes(tree).find(n=>n.type==="RecentStudyTimeCard").props.authenticated,true);
 app.session.enterGuestSession(); mounts.length=0; render(); assert.deepEqual(mounts,[]);
});
test("provider preserves child identity during slow hydration and settings/session changes",async()=>{
 const hooks=hookRuntime();
 const react={...hooks.react,createContext:()=>({Provider:"SettingsContextProvider"}),useContext:()=>null};
 const app=environment({react});
 const {createSettingsStore}=app.load("features/settings/storage/settingsStorage.ts");
 let resolveRead; const store=createSettingsStore({getItem:()=>new Promise(resolve=>{resolveRead=resolve;}),setItem:async()=>{}});
 const Provider=app.load("src/providers/SettingsProvider.tsx").SettingsProvider;
 const child={type:"navigator",key:"stable",props:{attempt:{answers:["A"],timer:42}}};
 const render=()=>hooks.render(Provider,{store,children:child});
 assert.equal(render().props.children,child); await new Promise(resolve=>setImmediate(resolve));
 resolveRead(JSON.stringify({schemaVersion:1,themeMode:"dark",listeningAutoplay:false})); await hooks.flush();
 const generation=app.session.getSessionSnapshot().generation; await store.updateSettings({themeMode:"light"});
 assert.equal(app.session.getSessionSnapshot().generation,generation);
 for(const transition of [()=>app.session.enterGuestSession(),()=>app.session.authenticateSession("fixture-user"),()=>app.session.enterGuestSession()]) {
  transition(); const tree=render(); assert.equal(tree.props.children,child); assert.equal(tree.props.value.preferences.themeMode,"light");
 }
 assert.equal(app.requests.length,0); hooks.dispose();
});

for (const offline of [false,true]) test("logout preserves pause/push/server/local order, offline="+offline,async()=>{
 const order=[];
 const failIfOffline=()=>{if(offline) throw Error("fixture offline");};
 const {app,render}=screenApp({
  "../../study/session/StudySessionProvider":{useStudySession:()=>({pause:async()=>{order.push("pause");failIfOffline();}})},
  "../../notifications/api/pushNotificationApi":{deactivateCurrentPushToken:async()=>{order.push("deactivate-push");failIfOffline();}},
  "../../auth/api/authApi":{logout:async()=>{order.push("server-logout");failIfOffline();}},
  "@/lib/auth/tokenStorage":{getAccessToken:async()=>{order.push("read-access");return "fixture-access";},removeTokens:async({generation,onSaved})=>{
   order.push("remove-tokens"); assert.equal(generation,app.session.getSessionSnapshot().generation); onSaved();
  }},
 });
 app.session.authenticateSession("fixture-user"); const tree=render(); button(tree,"Đăng xuất").props.onPress();
 app.alerts[0][2].find(action=>action.style==="destructive").onPress(); await app.hooks.flush();
 assert.deepEqual(order,["pause","deactivate-push","read-access","server-logout","remove-tokens"]);
 assert.equal(app.session.getSessionSnapshot().status,"guest"); assert.deepEqual(app.routerCalls,[["replace","/(tabs)/home"]]);
 if(offline) assert.equal(app.alerts[1][0],"Đã đăng xuất trên thiết bị");
});
