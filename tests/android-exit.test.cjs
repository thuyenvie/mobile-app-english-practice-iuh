const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/app/_layout.tsx"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Exercise the actual RootLayout effect without adding a React Native test runtime.
function mount(os = "android") {
  const effects = [];
  const handlers = [];
  const alerts = [];
  const state = { ready: true, canGoBack: false, exits: 0, removed: 0 };
  const navigationRef = {
    isReady: () => state.ready,
    canGoBack: () => state.canGoBack,
  };
  const modules = {
    react: { useEffect: effect => effects.push(effect) },
    "react/jsx-runtime": { jsx: () => null },
    "react-native": {
      Platform: { OS: os },
      Alert: { alert: (...args) => alerts.push(args) },
      BackHandler: {
        exitApp: () => state.exits++,
        addEventListener: (event, handler) => {
          assert.equal(event, "hardwareBackPress");
          handlers.push(handler);
          return { remove: () => { handlers.splice(handlers.indexOf(handler), 1); state.removed++; } };
        },
      },
    },
    "expo-router": { useNavigationContainerRef: () => navigationRef, Stack: () => null, router: {} },
    "@/lib/auth/sessionEvents": { subscribeToSessionExpiration: () => ({ remove() {} }) },
    tamagui: { TamaguiProvider: () => null },
    "../../tamagui.config": { config: {} },
    "@/providers/GoogleAuthProvider": { GoogleAuthProvider: () => null },
    "@/providers/SessionProvider": { SessionProvider: () => null },
    "@/theme/tokens": { authDesign: { colors: { background: "#000000" } } },
  };
  const context = {
    exports: {},
    require: name => {
      if (!(name in modules)) throw new Error("Unexpected dependency: " + name);
      return modules[name];
    },
  };
  vm.runInNewContext(compiled, context);
  context.exports.default();
  const cleanups = effects.map(effect => effect()).filter(Boolean);
  return { state, handlers, alerts, unmount: () => cleanups.forEach(cleanup => cleanup()) };
}

test("root Android consumes Back and shows the requested confirmation", () => {
  const app = mount();
  assert.equal(app.handlers.length, 1);
  assert.equal(app.handlers[0](), true);
  const [title, message, buttons] = app.alerts[0];
  assert.equal(title, "Thoát ứng dụng");
  assert.equal(message, "Bạn có chắc chắn muốn thoát ứng dụng không?");
  assert.equal(buttons[0].text, "Hủy");
  assert.equal(buttons[0].style, "cancel");
  assert.equal(buttons[1].text, "Thoát");
  assert.equal(app.state.exits, 0);
});

test("child stack or noninitial tab delegates Back and reads live navigation state", () => {
  const app = mount();
  app.state.canGoBack = true;
  assert.equal(app.handlers[0](), false);
  assert.equal(app.alerts.length, 0);
  app.state.canGoBack = false;
  assert.equal(app.handlers[0](), true);
  assert.equal(app.alerts.length, 1);
  assert.equal(app.handlers.length, 1);
});

test("does not show an exit alert before navigation is ready", () => {
  const app = mount();
  app.state.ready = false;
  assert.equal(app.handlers[0](), false);
  assert.equal(app.alerts.length, 0);
});

test("repeated Back does not stack alerts; Cancel allows another confirmation", () => {
  const app = mount();
  app.handlers[0]();
  assert.equal(app.handlers[0](), true);
  assert.equal(app.alerts.length, 1);
  app.alerts[0][2][0].onPress();
  assert.equal(app.state.exits, 0);
  app.handlers[0]();
  assert.equal(app.alerts.length, 2);
});

test("native dismissal resets the duplicate-alert guard", () => {
  const app = mount();
  app.handlers[0]();
  assert.equal(app.alerts[0][3].cancelable, true);
  app.alerts[0][3].onDismiss();
  app.handlers[0]();
  assert.equal(app.alerts.length, 2);
  assert.equal(app.state.exits, 0);
});

test("only confirming Exit calls exitApp", () => {
  const app = mount();
  app.handlers[0]();
  assert.equal(app.state.exits, 0);
  app.alerts[0][2][1].onPress();
  assert.equal(app.state.exits, 1);
});

test("unmount removes the single listener", () => {
  const app = mount();
  app.unmount();
  assert.equal(app.handlers.length, 0);
  assert.equal(app.state.removed, 1);
});

for (const os of ["ios", "web"]) {
  test(os + " does not register an Android Back listener", () => {
    const app = mount(os);
    assert.equal(app.handlers.length, 0);
    assert.equal(app.alerts.length, 0);
    app.unmount();
  });
}
