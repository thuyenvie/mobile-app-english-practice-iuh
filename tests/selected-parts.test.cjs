const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text, plain } = require("./helpers/guest-runtime.cjs");

function setup() {
  return environment({
    "../session/StudySessionProvider": { useStudySession: () => ({ refresh: async () => {} }) },
    "../components/StudyScaffold": { StudyScaffold: "StudyScaffold" },
  });
}
function action(app, title) {
  const found = nodes(app.hooks.output).findLast((node) => node.props.title === title && node.props.onPress);
  assert.ok(found, `Missing action: ${title}`);
  found.props.onPress();
}
function fixture(partNumber) {
  const ranges = [[1, 6], [7, 31], [32, 70], [71, 100], [101, 130], [131, 146], [147, 200]];
  const [first, last] = ranges[partNumber - 1];
  return { year: 2026, testNumber: 1, partNumber, type: partNumber <= 4 ? "LISTENING" : "READING", passages: [],
    questions: Array.from({ length: last - first + 1 }, (_, index) => ({ id: first + index, questionNumber: first + index, content: "Question", passageId: null, options: [{ label: "A", text: "Answer" }] })) };
}

test("Overview toggles multiple Parts and shows one complete start label", async () => {
  const app = setup();
  app.params = { year: "2026", testNumber: "1" };
  const Screen = app.load("features/study/screens/TestOverviewScreen.tsx").default;
  app.hooks.render(Screen);
  assert.ok(nodes(app.hooks.output).some((node) => node.props.accessibilityRole === "button" && node.props.disabled));
  for (const number of [1, 2, 7, 2]) {
    nodes(app.hooks.output).find((node) => node.props.part?.number === number).props.onStart();
    await app.hooks.flush();
  }
  assert.ok(text(app.hooks.output).includes("Part 1, 7 · 60 câu"));
  const start = nodes(app.hooks.output).find((node) => node.props.accessibilityLabel === "Bắt đầu luyện tập, đã chọn 2 Part");
  assert.equal(text(start), "Bắt đầu luyện tập (2 Part)");
  start.props.onPress();
  assert.deepEqual(plain(app.routerCalls[0][1].params), { year: "2026", testNumber: "1", parts: "1,7" });
  app.hooks.dispose();
});

test("Selected practice loads only chosen Parts, uses scoped audio, and retries only the failed Part", async () => {
  const app = setup();
  app.session.enterGuestSession();
  app.params = { year: "2026", testNumber: "1", parts: "1,7" };
  let failReading = true;
  app.handler = async (request) => {
    if (request.method === "get") return { result: fixture(Number(request.url.split("/").at(-1))) };
    const partNumber = Number(request.url.split("/").at(-2));
    if (partNumber === 7 && failReading) { failReading = false; app.fail(request, 503); }
    return { result: { section: partNumber <= 4 ? "LISTENING" : "READING", partNumber, score: 1, totalQuestions: fixture(partNumber).questions.length, answeredQuestions: 1, answers: [] } };
  };
  const Screen = app.load("features/study/screens/FullTestScreen.tsx").default;
  app.hooks.render(Screen, { practice: true });
  await app.hooks.flush();
  assert.deepEqual(app.requests.map((request) => request.url), ["/exam-service/exams/2026/1/parts/1", "/exam-service/exams/2026/1/parts/7"]);
  assert.equal(app.audioSources.length, 0);
  action(app, "Bắt đầu làm bài");
  await app.hooks.flush();
  assert.ok(nodes(app.hooks.output).some((node) => node.props.activeQuestionNumber === 1));
  nodes(app.hooks.output).find((node) => node.props.accessibilityRole === "radio").props.onPress();
  await app.hooks.flush();
  // Nhay qua cac cau Part 1, tiep theo phai la cau 147 cua Part 7.
  for (let index = 0; index < 6; index++) { action(app, "Tiếp ›"); await app.hooks.flush(); }
  assert.ok(text(app.hooks.output).includes("Câu 147"));
  nodes(app.hooks.output).find((node) => node.props.accessibilityRole === "radio").props.onPress();
  await app.hooks.flush();
  action(app, "Nộp"); await app.hooks.flush();
  action(app, "Nộp"); await app.hooks.flush();
  action(app, "Thử nộp phần còn lại"); await app.hooks.flush();
  const posts = app.requests.filter((request) => request.method === "post");
  assert.deepEqual(posts.map((request) => request.url), [
    "/exam-service/exams/guest/2026/1/listening/parts/1/submit",
    "/exam-service/exams/guest/2026/1/reading/parts/7/submit",
    "/exam-service/exams/guest/2026/1/reading/parts/7/submit",
  ]);
  assert.deepEqual(posts.map((request) => JSON.parse(request.data).answers.map((answer) => answer.questionNumber)), [[1], [147], [147]]);
  assert.ok(text(app.hooks.output).includes("Đã nộp các phần đã làm"));
  assert.equal(app.storageCalls.some(([operation]) => operation === "local:set"), false);
  app.hooks.dispose();
});

test("Part query rejects invalid selections and answer payload follows loaded question IDs", () => {
  const { parseSelectedParts, answersForPart } = setup().load("features/study/utils/selectedParts.ts");
  assert.deepEqual(plain(parseSelectedParts("7,1,7")), [1, 7]);
  for (const value of [undefined, "", "0", "8", "1,,7", "1.5", "1,7abc"]) assert.deepEqual(plain(parseSelectedParts(value)), []);
  assert.deepEqual(plain(answersForPart(fixture(7), { 1: "A", 147: "B", 201: "D" })), { 147: "B" });
});

test("Full Test still loads seven Parts and the continuous audio", async () => {
  const app = setup();
  app.session.enterGuestSession();
  app.params = { year: "2026", testNumber: "1" };
  app.handler = async (request) => request.url.endsWith("/audio")
    ? { result: { streamPath: "/exams/2026/1/listening/audio/stream" } }
    : { result: fixture(Number(request.url.split("/").at(-1))) };
  app.hooks.render(app.load("features/study/screens/FullTestScreen.tsx").default, {});
  await app.hooks.flush();
  assert.equal(app.requests.filter((request) => /\/parts\/[1-7]$/.test(request.url)).length, 7);
  assert.equal(app.audioSources.length, 1);
  assert.ok(nodes(app.hooks.output).some((node) => node.props.title === "Bắt đầu làm bài · 120 phút"));
  app.hooks.dispose();
});
