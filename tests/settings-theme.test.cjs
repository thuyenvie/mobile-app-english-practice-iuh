const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text } = require("./helpers/guest-runtime.cjs");

function providerFixture(store) {
  let system = "dark";
  const app = environment({
    "react-native": { View: "View", useColorScheme: () => system },
    "./useAppTheme": { AppThemeContext: { Provider: "ThemeContext" }, useAppTheme() {} },
    "../../tamagui.config": { config: {} },
    "@/providers/SettingsProvider": { useSettings: () => store.getSnapshot() },
  });
  const Provider = app.load("src/theme/ThemeProvider.tsx").ThemeProvider;
  const child = { type: "Navigator", key: "stable", props: { player: { position: 23 }, attempt: { answers: ["A"], timer: 42 } } };
  const render = () => app.hooks.render(Provider, { children: child });
  return { app, child, render, os: value => { system = value; } };
}
const snapshot = themeMode => ({ preferences: { themeMode, listeningAutoplay: true }, hydration: "ready" });

test("provider resolves all3 modes, OS changes and null fallback without changing navigator/player identity", () => {
  let state = snapshot("system"); const f = providerFixture({ getSnapshot: () => state });
  for (const [preference, os, expected] of [["system", "dark", "dark"], ["system", "light", "light"], ["system", null, "light"], ["light", "dark", "light"], ["dark", "light", "dark"]]) {
    state = snapshot(preference); f.os(os); const tree = f.render();
    assert.equal(tree.props.value.resolvedMode, expected);
    assert.equal(nodes(tree).find(n => n.type === "Navigator"), f.child);
    assert.equal(f.child.props.player.position, 23); assert.deepEqual(f.child.props.attempt.answers, ["A"]); assert.equal(f.child.props.attempt.timer, 42);
    assert.ok(nodes(tree).every(n => n.key !== "light" && n.key !== "dark"));
    assert.ok(nodes(tree).some(n => n.props.style === (expected === "dark" ? "light" : "dark")));
  }
  f.app.hooks.dispose();
});

test("slow hydration never writes defaults; failed persist keeps prior theme; retry survives restart", async () => {
  const app = environment(); const { createSettingsStore } = app.load("features/settings/storage/settingsStorage.ts");
  let resolveRead, fail = false, writes = 0, saved;
  const store = createSettingsStore({ getItem: () => new Promise(resolve => { resolveRead = resolve; }), setItem: async (_key, value) => { writes++; if (fail) throw Error("fixture offline"); saved = value; } });
  const f = providerFixture(store); const hydration = store.hydrate(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.render().props.value.resolvedMode, "dark"); assert.equal(writes, 0);
  resolveRead(JSON.stringify({ schemaVersion: 1, themeMode: "light", listeningAutoplay: false })); await hydration;
  assert.equal(f.render().props.value.resolvedMode, "light"); assert.equal(writes, 0);
  fail = true; await assert.rejects(store.updateSettings({ themeMode: "dark" }));
  assert.equal(f.render().props.value.resolvedMode, "light"); assert.equal(store.getSnapshot().persistence, "error");
  fail = false; await store.updateSettings({ themeMode: "dark" }); assert.equal(f.render().props.value.resolvedMode, "dark");
  const restarted = createSettingsStore({ getItem: async () => saved, setItem: async () => {} }); await restarted.hydrate();
  assert.equal(restarted.getSnapshot().preferences.themeMode, "dark"); assert.equal(restarted.getSnapshot().preferences.listeningAutoplay, false);
  f.app.hooks.dispose();
});

test("hydration failure follows OS provisionally and does not overwrite unread storage", async () => {
  const app = environment(); const { createSettingsStore } = app.load("features/settings/storage/settingsStorage.ts"); let writes = 0;
  const store = createSettingsStore({ getItem: async () => { throw Error("fixture read failure"); }, setItem: async () => { writes++; } });
  await assert.rejects(store.hydrate()); const f = providerFixture(store); f.os("light");
  assert.equal(f.render().props.value.resolvedMode, "light"); f.os("dark"); assert.equal(f.render().props.value.resolvedMode, "dark");
  assert.equal(writes, 0); f.app.hooks.dispose();
});

test("theme picker acknowledges persist, keeps failed selection unchanged, and is gated during hydration", async () => {
  const app = environment(); const { getAppTheme } = app.load("src/theme/palettes.ts");
  const settings = { ...snapshot("system"), persistence: "idle", updateSettings: async () => { throw Error("fixture"); } };
  const Entry = app.load("features/settings/entries/SET01Entry.tsx").SET01Entry;
  const render = () => app.hooks.render(Entry, { settings, theme: getAppTheme("light").settingsTheme });
  render(); const lightButton = nodes(app.hooks.output).find(n => n.props.accessibilityRole === "radio" && text(n).includes("Sáng"));
  lightButton.props.onPress(); await app.hooks.flush(); assert.match(text(app.hooks.output), /Chưa lưu/);
  assert.equal(nodes(app.hooks.output).find(n => n.props.accessibilityRole === "radio" && text(n).includes("Hệ thống")).props.accessibilityState.checked, true);
  settings.hydration = "loading"; render(); assert.ok(nodes(app.hooks.output).filter(n => n.props.accessibilityRole === "radio").every(n => n.props.disabled));
  app.hooks.dispose();
});

test("actual study question and About recolor while handlers, images and content remain unchanged", () => {
  const app = environment({ "expo-constants": { __esModule: true, default: { expoConfig: { name: "fixture", version: "1.0" } } } });
  const { getAppTheme } = app.load("src/theme/palettes.ts");
  const Card = app.load("features/study/components/ReadingQuestionCard.tsx").ReadingQuestionCard;
  const question = { id: 1, questionNumber: 1, content: "fixture question", imageUrl: "fixture-original-image", options: [{ label: "A", text: "answer" }] };
  const onSelect = () => {}; const props = { question, selectedOption: "A", focused: true, onSelect };
  const backgrounds = [];
  for (const mode of ["light", "dark"]) {
    app.theme = getAppTheme(mode); const tree = app.hooks.render(Card, props); backgrounds.push(tree.props.backgroundColor);
    assert.equal(tree.props.backgroundColor, app.theme.palette.surface); assert.equal(question.imageUrl, "fixture-original-image");
    assert.match(text(tree), /fixture question/);
  }
  assert.notEqual(backgrounds[0], backgrounds[1]); app.hooks.dispose();
  const about = app.load("features/settings/screens/AboutScreen.tsx").default;
  for (const mode of ["light", "dark"]) {
    app.theme = getAppTheme(mode); const tree = app.hooks.render(about);
    const scroll = nodes(tree).find(n => n.type === "ScrollView"); assert.equal(scroll.props.contentContainerStyle.backgroundColor, app.theme.palette.background);
    assert.match(text(tree), /fixture/);
  }
  assert.equal(app.requests.length, 0); app.hooks.dispose();
});

test("Settings passes reactive theme to unchanged SET06 seam", () => {
  const settings = { ...snapshot("system"), hydrationError: null, persistenceError: null, recoveredFields: [], updateSettings: async () => {}, retryHydration: async () => {} };
  const app = environment({ "@/providers/SettingsProvider": { useSettings: () => settings }, "../../notifications/api/pushNotificationApi": { deactivateCurrentPushToken: async () => {} } });
  const { getAppTheme } = app.load("src/theme/palettes.ts"), Screen = app.load("features/settings/screens/SettingsScreen.tsx").default;
  for (const mode of ["light", "dark"]) {
    app.theme = getAppTheme(mode); const tree = app.hooks.render(Screen);
    const cache = nodes(tree).find(n => typeof n.type === "function" && n.type.name === "SET06Entry");
    assert.equal(cache.props.theme, app.theme.settingsTheme);
  }
  app.hooks.dispose();
});

function luminance(color) {
  const values = color.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
test("body/muted/error/primary/selected text contrast is readable in both palettes", () => {
  const { getAppTheme } = environment().load("src/theme/palettes.ts");
  for (const mode of ["light", "dark"]) {
    const p = getAppTheme(mode).palette;
    for (const [fg, bg] of [[p.text, p.background], [p.text, p.surface], [p.muted, p.surface], [p.error, p.surface], [p.onAccent, p.accent], [p.onSelection, p.selection]]) {
      const a = luminance(fg), b = luminance(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= 4.5, `${mode} ${fg}/${bg} contrast ${ratio}`);
    }
  }
});
