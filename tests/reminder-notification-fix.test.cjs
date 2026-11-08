const test = require("node:test");
const assert = require("node:assert/strict");
const { AxiosError } = require("axios");
const { environment, nodes, button, text, plain } = require("./helpers/guest-runtime.cjs");

const plan = extra => ({ id: 1, targetScore: 750, currentScore: 500, targetDate: null, dailyMinutes: 30,
  timezone: "Asia/Ho_Chi_Minh", reminderDays: [1, 2, 3, 4, 5, 6, 7], reminderEnabled: true,
  reminderTime: "20:00:00", quietStart: null, quietEnd: null, ...extra });

for (const status of [401, 403, 503, null]) test(`registration explains authentication/service/network error ${status}`, async () => {
  const app = environment(); app.session.authenticateSession("self");
  const expected = status === 401 || status === 403 ? /chưa xác thực/ : status === 503 ? /tạm thời không khả dụng/ : /kiểm tra mạng/;
  const controller = app.load("features/settings/reminder/reminderController.ts").createReminderController(
    app.session.getSessionSnapshot(), {
      load: async () => plan(), patch: async () => plan(),
      register: async () => { throw new AxiosError("offline fixture", "ERR_BAD_RESPONSE", undefined, undefined,
        status ? { status, data: {} } : undefined); },
    });
  await controller.load(); await controller.save(); await controller.register();
  assert.equal(controller.getSnapshot().device, "error");
  assert.match(controller.getSnapshot().error, expected);
  assert.equal(controller.getSnapshot().saved, true);
  assert.equal(controller.getSnapshot().busy, false);
  assert.equal(app.session.getSessionSnapshot().status, "authenticated");
});

test("disabled daily reminders still allow explicit device registration without changing the plan", async () => {
  let registrations = 0;
  const app = environment({ "../../notifications/api/pushNotificationApi": {
    registerStudyPushToken: async () => { registrations++; return "registered"; },
  } });
  app.session.authenticateSession("self");
  app.handler = async () => ({ code: 1000, result: plan({ reminderEnabled: false }) });
  const Entry = app.load("features/settings/entries/SET03Entry.tsx").SET03Entry;
  const theme = app.load("src/theme/palettes.ts").getAppTheme("light").settingsTheme;
  app.hooks.render(Entry, { authenticated: true, theme }); await app.hooks.flush();
  app.hooks.render();
  const register = button(app.hooks.output, "Cho phép nhận thông báo");
  assert.equal(register.props.disabled, false);
  register.props.onPress(); await app.hooks.flush();
  assert.equal(registrations, 1); assert.ok(app.requests.every(request => request.method === "get"));
});

test("quiet intervals match backend boundaries, midnight, disabled pair and canonical seconds", () => {
  const app = environment();
  const { isReminderInQuietHours: quiet, getQuietHoursError: validate } = app.load("features/settings/reminder/reminderSchedule.ts");
  for (const time of ["22:00", "23:35", "00:40", "06:59"]) assert.equal(quiet(time, "22:00", "07:00"), true);
  for (const time of ["07:00", "12:00", "21:59"]) assert.equal(quiet(time, "22:00", "07:00"), false);
  assert.equal(quiet("00:40:00", "01:00:00", "07:00:00"), false);
  assert.equal(quiet("12:00", "12:00", "12:00"), false);
  assert.equal(quiet("12:00", null, null), false);
  assert.equal(validate("", ""), null);
  assert.equal(validate("22:00", "07:00"), null);
  for (const [start, end] of [["", "07:00"], ["22:00", ""], ["24:00", "07:00"], ["22:00", "07:99"]]) {
    assert.match(validate(start, end), /HH:mm/);
  }
});

test("both quiet-hour fields share size, format, labels, disabled state and keyboard progression", () => {
  const app = environment();
  const Fields = app.load("features/settings/reminder/QuietHoursFields.tsx").QuietHoursFields;
  const tree = app.hooks.render(Fields, { start: "22:00", end: "07:00", theme: {}, disabled: true });
  const inputs = nodes(tree).filter(n => n.props.label);
  assert.deepEqual(inputs.map(n => n.props.label), ["Yên lặng từ", "Yên lặng đến"]);
  assert.ok(inputs.every(n => n.type === inputs[0].type && n.props.maxLength === 5 && n.props.disabled === true));
  assert.ok(inputs.every(n => n.props.placeholder.startsWith("HH:mm")));
  assert.equal(inputs[0].props.returnKeyType, "next"); assert.equal(inputs[1].props.returnKeyType, "done");
  let focused = false;
  inputs[1].props.inputRef.current = { focus: () => { focused = true; } };
  inputs[0].props.onSubmitEditing(); assert.equal(focused, true);
});

async function setupFixture(extra = {}) {
  const saved = [];
  const app = environment({
    "../components/StudyScaffold": { StudyScaffold: "StudyScaffold" },
    "@expo/vector-icons/MaterialIcons": { default: "MaterialIcons", __esModule: true },
    "../api/studyPlanApi": {
      getStudyPlan: async () => plan(extra),
      saveStudyPlan: async input => { saved.push(plain(input)); return plan(input); },
    },
    "../../notifications/api/pushNotificationApi": { registerStudyPushToken: async () => "registered" },
  });
  app.session.authenticateSession("self");
  app.hooks.render(app.load("features/study/screens/StudyPlanSetupScreen.tsx").default);
  await app.hooks.flush();
  const quiet = () => nodes(app.hooks.output).find(n => n.type?.name === "QuietHoursFields");
  return { app, saved, quiet, submit: () => button(app.hooks.output, "Lưu mục tiêu và tạo lịch").props.onPress() };
}

test("Study Goals preserves cleared quiet hours instead of restoring 22:00-07:00", async () => {
  const f = await setupFixture();
  assert.equal(f.quiet().props.start, ""); assert.equal(f.quiet().props.end, "");
  await f.submit(); await f.app.hooks.flush();
  assert.equal(f.saved[0].quietStart, null); assert.equal(f.saved[0].quietEnd, null);
  assert.equal(f.saved[0].timezone, "Asia/Ho_Chi_Minh");
});

test("Study Goals rejects a partial quiet pair and accepts clearing both", async () => {
  const f = await setupFixture();
  f.quiet().props.onStartChange("22:00"); await f.app.hooks.flush();
  await f.submit(); await f.app.hooks.flush(); assert.equal(f.saved.length, 0);
  assert.match(text(f.app.hooks.output), /nhập đủ cả hai giờ/);
  f.quiet().props.onEndChange("07:00"); await f.app.hooks.flush();
  await f.submit(); await f.app.hooks.flush();
  assert.equal(f.saved[0].quietStart, "22:00"); assert.equal(f.saved[0].quietEnd, "07:00");
});

test("turning daily reminders off in Study Goals preserves quiet hours for vocabulary reminders", async () => {
  const f = await setupFixture({ quietStart: "22:00:00", quietEnd: "07:00:00" });
  const toggle = nodes(f.app.hooks.output).find(n => n.props.accessibilityLabel === "Nhắc lịch theo kế hoạch học");
  toggle.props.onValueChange(false); await f.app.hooks.flush();
  await f.submit(); await f.app.hooks.flush();
  assert.equal(f.saved[0].reminderEnabled, false);
  assert.equal(f.saved[0].quietStart, "22:00"); assert.equal(f.saved[0].quietEnd, "07:00");
});

test("both Study Goals and Settings explain reminder times inside quiet hours", async () => {
  const f = await setupFixture({ reminderTime: "23:35:00", quietStart: "22:00:00", quietEnd: "07:00:00" });
  assert.match(text(f.app.hooks.output), /nằm trong khoảng yên lặng/);
  const app = environment({ "../../notifications/api/pushNotificationApi": { registerStudyPushToken: async () => "registered" } });
  app.session.authenticateSession("self");
  app.handler = async () => ({ code: 1000, result: plan({ reminderTime: "23:35", quietStart: "22:00", quietEnd: "07:00" }) });
  app.hooks.render(app.load("features/settings/entries/SET03Entry.tsx").SET03Entry,
    { authenticated: true, theme: app.load("src/theme/palettes.ts").getAppTheme("light").settingsTheme });
  await app.hooks.flush(); app.hooks.render(); assert.match(text(app.hooks.output), /nằm trong khoảng yên lặng/);
});
