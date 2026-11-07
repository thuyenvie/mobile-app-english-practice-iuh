const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text, plain } = require("./helpers/guest-runtime.cjs");

const word = (id, name) => ({ id, word: name, phonetic: "/ˈlektʃər/", englishDefinition: "A lesson", vietnameseMeaning: "buổi giảng", savedAt: new Date().toISOString() });
const words = [word("11111111-1111-4111-8111-111111111111", "lecture"), word("22222222-2222-4222-8222-222222222222", "among")];
const plan = { id: 1, timezone: "Asia/Ho_Chi_Minh", quietStart: "00:00", quietEnd: "07:00" };
const task = { id: 42, source: "USER", taskType: "VOCABULARY_REVIEW", section: "VOCABULARY", status: "PENDING", title: "Ôn 2 từ vựng", dueDate: "2026-11-05", scheduledAt: "2026-11-05T16:00:00Z", reminderAt: "2026-11-05T15:55:00Z", reminderMinutesBefore: 5, estimatedMinutes: 10, vocabularyCount: 2, description: "lecture · among" };
const detail = { task, timezone: plan.timezone, vocabulary: words };
const stop = () => {};
function setup() {
  let current = null;
  const calls = [];
  const provider = { useStudySession: () => ({ current, busy: false, error: "", refresh: async () => {},
    start: async id => { calls.push(["start", id]); current = { id: 9, taskId: id, status: "RUNNING", section: "VOCABULARY" }; },
    resume: async () => { current.status = "RUNNING"; }, pause: async () => { current.status = "PAUSED"; },
    end: async complete => { calls.push(["end", complete]); current.status = "ENDED"; } }), useStudyElapsed: () => 30, formatStudyTime: () => "00:30" };
  const app = environment({
    "../../study/components/StudyScaffold": { StudyScaffold: "StudyScaffold" },
    "../../home/components/HomeScaffold": { HomeScaffold: "HomeScaffold" },
    "../hooks/useVocabularyPronunciation": { useVocabularyPronunciation: () => ({ stop, activeUrl: null, activeWord: "", loading: false, playing: false, error: "", play() {} }) },
    "../../notifications/api/pushNotificationApi": { registerStudyPushToken: async () => "registered", getStudyPushStatus: async () => "ready" },
    "../../study/session/StudySessionProvider": provider,
    "./StudySessionProvider": provider,
  });
  app.session.authenticateSession("alice");
  app.calls = calls;
  return app;
}
function click(app, label) {
  const found = nodes(app.hooks.output).find(node => node.props.onPress && (text(node) === label || node.props.label === label));
  assert.ok(found, `Button missing: ${label}`); found.props.onPress();
}

test("Select specific saved words and carry only those IDs into the schedule form", async () => {
  const app = setup();
  app.handler = async () => ({ result: { items: words, page: 0, totalPages: 1, totalItems: 2 } });
  app.hooks.render(app.load("features/vocabulary/screens/VocabularyScreen.tsx").default);
  await app.hooks.flush();
  click(app, "Lên lịch ôn"); await app.hooks.flush();
  const list = nodes(app.hooks.output).find(node => node.props.renderItem);
  const row = list.props.renderItem({ item: words[0] });
  nodes(row).find(node => node.props.accessibilityRole === "checkbox").props.onPress();
  await app.hooks.flush();
  click(app, "Lên lịch ôn (1 từ)");
  assert.equal(app.routerCalls[0][1].params.ids, words[0].id);
  assert.equal(app.routerCalls[0][1].params.words, "lecture");
  app.hooks.dispose();
});

test("Save schedule posts UTC with stable requestId, then offers navigation Home", async () => {
  const app = setup();
  app.params = { ids: words.map(w => w.id).join(","), words: "lecture · among" };
  app.handler = async req => req.method === "get" ? { result: plan } : { result: detail };
  app.hooks.render(app.load("features/vocabulary/screens/VocabularyScheduleScreen.tsx").default);
  await app.hooks.flush();
  click(app, "Lưu lịch ôn"); await app.hooks.flush();
  const post = app.requests.find(req => req.method === "post");
  const payload = JSON.parse(post.data);
  assert.deepEqual(payload.vocabularyIds, words.map(w => w.id));
  assert.match(payload.requestId, /^[A-Za-z0-9-]{10,80}$/);
  assert.ok(Date.parse(payload.scheduledAt) > Date.now());
  assert.equal(payload.reminderMinutesBefore, 5);
  assert.equal(app.alerts[0][0], "Đã lưu lịch ôn");
  app.alerts[0][2][0].onPress();
  assert.deepEqual(plain(app.routerCalls[0]), ["replace", "/(tabs)/home"]);
  app.hooks.dispose();
});

test("Home shows separate vocabulary tasks even after the Reading task is complete", async () => {
  const app = setup();
  app.handler = async req => req.url.endsWith("/today") ? { result: { plan, toDate: "2026-11-05", completedTasks: 1, totalTasks: 2, tasks: [{ id: 1, title: "Reading đã xong", status: "COMPLETED", section: "READING" }, task] } } : { result: [task] };
  app.hooks.render(app.load("features/home/components/TodayStudySessionCard.tsx").TodayStudySessionCard);
  await app.hooks.flush();
  assert.ok(text(app.hooks.output).includes("Reading đã xong"));
  assert.ok(text(app.hooks.output).includes("Ôn 2 từ vựng"));
  assert.ok(text(app.hooks.output).includes("Nhắc trước 5 phút"));
  click(app, "Sửa lịch");
  assert.equal(app.routerCalls[0][1].params.taskId, "42");
  app.hooks.dispose();
});

test("Review loads its snapshot set, starts the right session and completes it", async () => {
  const app = setup(); app.params = { taskId: "42" };
  app.handler = async () => ({ result: detail });
  app.hooks.render(app.load("features/vocabulary/screens/VocabularyTaskReviewScreen.tsx").default);
  await app.hooks.flush();
  click(app, "Bắt đầu ôn"); await app.hooks.flush(); app.hooks.render();
  const flash = nodes(app.hooks.output).find(node => node.props.item?.id === words[0].id);
  assert.ok(flash); assert.equal(flash.props.total, 2);
  flash.props.onNext(); await app.hooks.flush();
  assert.ok(nodes(app.hooks.output).some(node => node.props.item?.id === words[1].id));
  click(app, "Kết thúc"); await app.hooks.flush();
  const complete = nodes(app.hooks.output).find(node => node.props.label === "Đã hoàn thành");
  complete.props.onPress(); await app.hooks.flush();
  assert.deepEqual(app.calls, [["start", 42], ["end", true]]);
  assert.deepEqual(app.requests.map(req => req.url), ["/exam-service/study-tasks/42"]);
  app.hooks.dispose();
});

test("Date parsing rejects impossible dates instead of silently moving to another month", () => {
  const { scheduleInstant } = setup().load("features/vocabulary/utils/scheduleTime.ts");
  assert.equal(scheduleInstant("2026-02-30", "20:00"), null);
  assert.equal(scheduleInstant("2026-11-05", "25:00"), null);
  assert.equal(scheduleInstant("2026-1-5", "20:00"), null);
  assert.ok(scheduleInstant("2026-11-05", "20:00").endsWith("Z"));
});
