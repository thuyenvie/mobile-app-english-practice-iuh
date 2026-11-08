const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text, plain } = require("./helpers/guest-runtime.cjs");

function nodeWith(tree, predicate) {
  const found = nodes(tree).find(predicate);
  assert.ok(found, "Expected UI element");
  return found;
}
const style = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));

for (const os of ["android", "ios"]) test(`form reveals focused input after IME/layout and removes listener: ${os}`, () => {
  let keyboardShown, removed = false;
  const input = {}, calls = [];
  const app = environment({ "react-native": {
    Platform: { OS: os }, StyleSheet: { create: x => x }, KeyboardAvoidingView: "KeyboardAvoidingView", ScrollView: "ScrollView",
    TextInput: { State: { currentlyFocusedInput: () => input } },
    Keyboard: { addListener: (name, callback) => { assert.equal(name, "keyboardDidShow"); keyboardShown = callback; return { remove: () => { removed = true; } }; } },
  } });
  const tree = app.hooks.render(app.load("src/components/ui/FormScrollView.tsx").FormScrollView, { children: "form" });
  assert.equal(tree.type.name, "KeyboardViewport");
  const provider = tree.props.children, scroll = provider.props.children;
  scroll.props.ref.current = { scrollResponderScrollNativeHandleToKeyboard: (...args) => calls.push(args) };
  provider.props.value(); keyboardShown(); scroll.props.onLayout({});
  assert.equal(calls.length, 3);
  assert.ok(calls.every(args => args[0] === input && args[1] > 0));
  app.hooks.dispose(); assert.equal(removed, true);
});

for (const os of ["android", "ios"]) test(`keyboard offset follows measured safe area and banner top: ${os}`, () => {
  const app = environment({ "react-native": {
    Platform: { OS: os }, StyleSheet: { create: x => x }, View: "View", KeyboardAvoidingView: "KeyboardAvoidingView",
  } });
  const Viewport = app.load("src/components/ui/FormScrollView.tsx").KeyboardViewport;
  let tree = app.hooks.render(Viewport, { children: "form" });
  for (const top of [50, 138, 24]) {
    tree.props.ref.current = { measureInWindow: callback => callback(0, top, 360, 500) };
    tree.props.onLayout(); tree = app.hooks.render(Viewport, { children: "form" });
    assert.equal(tree.props.children.props.keyboardVerticalOffset, top);
    assert.equal(tree.props.children.props.behavior, os === "android" ? "height" : "padding");
  }
  app.hooks.dispose();
});

for (const os of ["android", "ios"]) test(`AI chat keeps flexible keyboard avoidance when its tab bar hides: ${os}`, () => {
  const app = environment({
    "react-native": { Platform: { OS: os }, StyleSheet: { create: x => x }, View: "View", KeyboardAvoidingView: "KeyboardAvoidingView" },
    "expo-image-picker": {},
  });
  const screen = app.hooks.render(app.load("features/ai/screens/AiTutorScreen.tsx").default);
  const viewport = nodeWith(screen, n => n.type?.name === "KeyboardViewport");
  app.hooks.dispose();
  let tree = app.hooks.render(viewport.type, viewport.props);
  for (const height of [776, 864, 500, 864]) {
    tree.props.ref.current = { measureInWindow: callback => callback(0, 50, 360, height) };
    tree.props.onLayout(); tree = app.hooks.render(viewport.type, viewport.props);
    const avoidance = tree.props.children;
    assert.equal(avoidance.props.behavior, "padding");
    assert.equal(avoidance.props.keyboardVerticalOffset, 50);
    assert.equal(style(avoidance.props.style).flex, 1);
    assert.equal(style(avoidance.props.style).height, undefined);
  }
  assert.equal(app.requests.length, 0);
  app.hooks.dispose();
});

for (const pending of [true, false]) test(`catalog stays usable while auxiliary sections ${pending ? "wait" : "fail"}; retry stays scoped`, async () => {
  const calls = { catalog: 0, plan: 0, history: 0 };
  const app = environment({
    "../components/StudyScaffold": { StudyScaffold: "StudyScaffold" },
    "../api/examApi": {
      getTestNumbersByYear: async () => { calls.catalog++; return [1, 2]; },
      getExamErrorMessage: error => error.message,
    },
    "../api/studyPlanApi": { getTodaySchedule: () => {
      calls.plan++; return pending ? new Promise(() => {}) : Promise.reject(Error("plan offline"));
    } },
    "../api/examResultApi": { getExamHistory: () => {
      calls.history++; return pending ? new Promise(() => {}) : Promise.reject(Error("history offline"));
    } },
  });
  app.session.authenticateSession("fixture-user");
  app.hooks.render(app.load("features/study/screens/StudyScreen.tsx").default);
  await app.hooks.flush();
  const tree = app.hooks.output;
  assert.equal(nodes(tree).some(node => node.props.overlay), false);
  const cards = nodes(tree).filter(node => node.props.testNumber);
  assert.deepEqual(cards.map(node => node.props.testNumber), [1, 2]);
  cards[0].props.onPress();
  assert.equal(app.routerCalls[0][1].pathname, "/study/[year]/[testNumber]");
  assert.equal(app.routerCalls[0][1].params.testNumber, "1");
  assert.deepEqual(calls, { catalog: 1, plan: 1, history: 1 });
  if (!pending) {
    nodeWith(tree, n => n.props.message?.includes("plan offline")).props.onRetry();
    await app.hooks.flush();
    assert.deepEqual(calls, { catalog: 1, plan: 2, history: 1 });
    nodeWith(app.hooks.output, n => n.props.message?.includes("history offline")).props.onRetry();
    await app.hooks.flush();
    assert.deepEqual(calls, { catalog: 1, plan: 2, history: 2 });
  }
  app.hooks.dispose();
});

test("Register explains availability before requesting credentials and keeps existing alternatives", () => {
  const app = environment();
  const tree = app.hooks.render(app.load("features/auth/screens/RegisterScreen.tsx").default);
  assert.match(tree.props.title, /chưa khả dụng/);
  assert.equal(nodes(tree).some(n => /Input/.test(String(n.type))), false);
  nodeWith(tree, n => text(n) === "Tiếp tục học thử" && n.props.onPress).props.onPress();
  assert.deepEqual(plain(app.routerCalls), [["replace", "/(tabs)/home"]]);
  assert.equal(app.requests.length, 0);
  app.hooks.dispose();
});

test("Guest sees the Full Test grading restriction on Overview before navigation", () => {
  const app = environment({ "../components/StudyScaffold": { StudyScaffold: "StudyScaffold" } });
  app.session.enterGuestSession(); app.params = { year: "2026", testNumber: "1" };
  const tree = app.hooks.render(app.load("features/study/screens/TestOverviewScreen.tsx").default);
  assert.match(text(tree), /Full Test chưa hỗ trợ chấm điểm hoặc lưu kết quả/);
  assert.match(text(tree), /Chọn Part bên dưới/);
  assert.equal(app.requests.length, 0);
  app.hooks.dispose();
});

test("password reveal keeps value, autofill, disabled state and submit policy", () => {
  const app = environment();
  const Field = app.load("features/settings/components/SettingsTextField.tsx").SettingsTextField;
  const theme = app.load("src/theme/palettes.ts").getAppTheme("dark").settingsTheme;
  const change = () => {}, submit = () => {};
  const props = { label: "Mật khẩu mới", value: "fixture-password", theme, onChangeText: change,
    secureTextEntry: true, autoComplete: "new-password", returnKeyType: "next", onSubmitEditing: submit };
  let tree = app.hooks.render(Field, props);
  assert.equal(nodeWith(tree, n => n.type === "TextInput").props.secureTextEntry, true);
  nodeWith(tree, n => n.props.accessibilityLabel === "Hiện mật khẩu mới").props.onPress();
  tree = app.hooks.render(Field, props);
  const input = nodeWith(tree, n => n.type === "TextInput").props;
  assert.equal(input.secureTextEntry, false);
  assert.equal(input.value, props.value); assert.equal(input.onChangeText, change);
  assert.equal(input.autoComplete, "new-password"); assert.equal(input.submitBehavior, "submit");
  assert.equal(input.onSubmitEditing, submit);
  tree = app.hooks.render(Field, { ...props, disabled: true });
  assert.equal(nodeWith(tree, n => n.type === "TextInput").props.editable, false);
  assert.equal(nodeWith(tree, n => n.props.accessibilityLabel === "Ẩn mật khẩu mới").props.disabled, true);
  assert.equal(app.requests.length, 0); app.hooks.dispose();
});

for (const entry of ["04", "05"]) test(`account editor ${entry} retains validation, payload and busy button`, async () => {
  const updates = [];
  let completeSave;
  const profile = { firstName: "An", lastName: "Nguyen", dob: "2000-01-31" };
  const app = environment({ "../api/accountSettingsApi": {
    getAccountProfile: async () => profile,
    getAccountSettingsError: error => error.message,
    updateAccountProfile: input => { updates.push(plain(input)); return new Promise(resolve => { completeSave = () => resolve(input); }); },
    updateAccountPassword: input => { updates.push(plain(input)); return new Promise(resolve => { completeSave = resolve; }); },
  } });
  app.session.authenticateSession("fixture-user");
  const theme = app.load("src/theme/palettes.ts").getAppTheme("light").settingsTheme;
  app.hooks.render(app.load(`features/settings/entries/SET${entry}Entry.tsx`)[`SET${entry}Entry`], { authenticated: true, theme });
  nodeWith(app.hooks.output, n => n.props.expanded === false).props.onPress();
  await app.hooks.flush();
  const change = (label, value) => nodeWith(app.hooks.output, n => n.props.label === label).props.onChangeText(value);
  const save = () => nodeWith(app.hooks.output, n => n.props.onPress && text(n) === (entry === "04" ? "Lưu thông tin" : "Đổi mật khẩu")).props.onPress();
  if (entry === "04") {
    change("Tên", "  Lan  ");
  } else {
    change("Mật khẩu hiện tại", "current-fixture"); change("Mật khẩu mới", "new-fixture"); change("Xác nhận mật khẩu mới", "mismatch");
    await app.hooks.flush(); save(); await app.hooks.flush();
    assert.match(text(app.hooks.output), /không khớp/); assert.equal(updates.length, 0);
    change("Xác nhận mật khẩu mới", "new-fixture");
  }
  await app.hooks.flush(); save(); await app.hooks.flush();
  const busy = nodeWith(app.hooks.output, n => n.props.onPress && text(n).startsWith("Đang"));
  assert.equal(busy.props.disabled, true);
  assert.deepEqual(updates, [entry === "04" ? { ...profile, firstName: "Lan" } : { currentPassword: "current-fixture", newPassword: "new-fixture" }]);
  completeSave(); await app.hooks.flush();
  assert.match(text(app.hooks.output), /Đã cập nhật thông tin cá nhân|Đã đổi mật khẩu thành công/);
  if (entry === "05") assert.equal(nodeWith(app.hooks.output, n => n.props.label === "Mật khẩu mới").props.value, "");
  app.hooks.dispose();
});

test("dialog bounds include nonzero safe areas and keep actions in the scroll body", () => {
  const app = environment({
    "react-native": { View: "View", ScrollView: "ScrollView", StyleSheet: { create: x => x },
      useWindowDimensions: () => ({ width: 320, height: 568 }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }) },
  });
  const child = { type: "button", props: { children: "Confirm" } };
  const tree = app.hooks.render(app.load("src/components/ui/DialogContent.tsx").DialogContent, { children: child });
  assert.equal(style(tree.props.style).maxHeight, 448);
  assert.equal(style(tree.props.style).marginBottom, 48);
  assert.equal(tree.props.children.type, "ScrollView");
  assert.equal(tree.props.children.props.children, child);
  app.hooks.dispose();
});

test("new chat keeps suggestions in the scroll list even though the greeting is already a message", () => {
  const app = environment();
  const chat = app.hooks.render(app.load("features/ai/hooks/useTutorChat.ts").useTutorChat);
  assert.equal(chat.canShowSuggestions, true);
  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0].kind, "greeting");
  app.hooks.dispose();
  const content = { type: "suggestions", props: { children: "Choose a prompt" } };
  const tree = app.hooks.render(app.load("features/ai/components/AiMessageList.tsx").AiMessageList, {
    messages: chat.messages, suggestionContent: content, loading: false, loadingHistory: false, hasOlderMessages: false,
  });
  assert.equal(tree.props.data, chat.messages);
  assert.ok(nodes(tree.props.ListFooterComponent).includes(content));
  assert.equal(app.requests.length, 0);
  app.hooks.dispose();
});

function contrast(fg, bg) {
  const luminance = color => {
    const c = color.slice(1).match(/../g).map(x => parseInt(x, 16) / 255)
      .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const mode of ["light", "dark"]) test(`actual Overview CTA, user bubble and goal header have readable contrast: ${mode}`, () => {
  const app = environment({
    "../components/StudyScaffold": { StudyScaffold: "StudyScaffold" },
    "../../study/api/studyTimeApi": { emptyRecentStudyTime: () => [] },
  });
  app.theme = app.load("src/theme/palettes.ts").getAppTheme(mode);
  app.params = { year: "2026", testNumber: "1" };
  let tree = app.hooks.render(app.load("features/study/screens/TestOverviewScreen.tsx").default);
  const cta = nodeWith(tree, n => n.props.accessibilityLabel?.startsWith("Bắt đầu luyện tập"));
  assert.ok(contrast(style(cta.props.children.props.style).color, style(cta.props.style).backgroundColor) >= 4.5);
  app.hooks.dispose();
  const List = app.load("features/ai/components/AiMessageList.tsx").AiMessageList;
  tree = app.hooks.render(List, { messages: [], loading: false, loadingHistory: false, hasOlderMessages: false });
  const bubble = tree.props.renderItem({ item: { id: "fixture", role: "user", kind: "image", text: "question", imageUri: null } });
  const expanded = app.hooks.render(bubble.type, bubble.props);
  const foreground = nodeWith(expanded, n => n.props.children === "question").props.color;
  const background = nodeWith(expanded, n => n.props.backgroundColor === app.theme.palette.accent).props.backgroundColor;
  assert.ok(contrast(foreground, background) >= 4.5);
  const note = nodeWith(expanded, n => typeof n.props.children === "string" && n.props.children.includes("Ảnh không còn"));
  assert.ok(contrast(note.props.color, background) >= 4.5);
  app.hooks.dispose();
  tree = app.hooks.render(app.load("features/home/components/RecentStudyTimeCard.tsx").RecentStudyTimeCard, { authenticated: false });
  const title = nodeWith(tree, n => n.props.children === "Đặt mục tiêu thời gian (phút)");
  assert.ok(contrast(style(title.props.style).color, app.theme.palette.accent) >= 4.5);
  app.hooks.dispose();
});
