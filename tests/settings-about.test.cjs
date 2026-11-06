const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, text, nodes, button } = require("./helpers/guest-runtime.cjs");

function expand(tree) {
  if (Array.isArray(tree)) return tree.map(expand);
  if (!tree || typeof tree !== "object") return tree;
  if (typeof tree.type === "function") return expand(tree.type(tree.props));
  return { ...tree, props: { ...tree.props, children: expand(tree.props?.children) } };
}
const theme = Object.fromEntries(["background", "surface", "text", "muted", "border", "accent"].map(k => [k, "#000000"]));
const metadata = () => environment().load("features/settings/metadata/aboutMetadata.ts").getAboutMetadata;

test("metadata uses runtime name/version and ignores binary, OTA, package and extra values", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(metadata()({ name: " Runtime app ", version: "2.3.4", ios: { buildNumber: "99" }, extra: { secret: "never-render" } }))), { name: "Runtime app", version: "2.3.4" });
});
test("missing or invalid config fields fall back independently without crashing", () => {
  const get = metadata();
  for (const value of [null, undefined, {}, { name: "", version: 42 }, { name: "bad\nname", version: " " }]) {
    assert.match(get(value).name, /chưa khả dụng/);
    assert.match(get(value).version, /Chưa có/);
  }
  assert.equal(get({ name: "App" }).name, "App");
  assert.equal(get({ version: "7.0" }).version, "7.0");
});
test("About entry opens the public route for Guest and authenticated users", () => {
  for (const authenticated of [false, true]) {
    const app = environment();
    const Entry = app.load("features/settings/entries/SET07Entry.tsx").SET07Entry;
    const tree = expand(Entry({ theme, authenticated }));
    button(tree, "Giới thiệu ứng dụng").props.onPress();
    assert.deepEqual(app.routerCalls, [["push", "/settings/about"]]);
    assert.equal(app.requests.length, 0);
  }
});
for (const canGoBack of [false, true]) test("public About renders offline and returns safely, stack=" + canGoBack, () => {
  const calls = [];
  const app = environment({
    "expo-constants": { __esModule: true, default: { expoConfig: { name: "Runtime app", version: "2.0", extra: { secret: "never-render" } } } },
    "@/theme/settingsTheme": { settingsTheme: theme },
    "expo-router": { router: { canGoBack: () => canGoBack, back: () => calls.push("back"), replace: path => calls.push(path) } },
  });
  const Screen = app.load("src/app/settings/about.tsx").default;
  for (const authenticated of [false, true]) {
    if (authenticated) app.session.authenticateSession("fixture-user");
    const tree = expand(app.hooks.render(Screen));
    assert.match(text(tree), /Runtime app/); assert.match(text(tree), /2.0/);
    assert.ok(!text(tree).includes("never-render")); assert.equal(app.requests.length, 0);
    assert.ok(nodes(tree).filter(n => n.type === "Text").every(n => n.props.allowFontScaling !== false));
    button(tree, "Quay lại").props.onPress();
  }
  assert.deepEqual(calls, [canGoBack ? "back" : "/(tabs)/settings", canGoBack ? "back" : "/(tabs)/settings"]);
});
