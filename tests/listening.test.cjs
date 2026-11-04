const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

// Dung TypeScript san co; khong them test framework chi cho vai ham thuan.
const source = fs.readFileSync(path.join(__dirname, "../features/study/utils/listening.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { sanitizeListeningAnswers, toListeningAnswers, listeningStreamUrl } = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));

test("giu A-D Part 1, A-C Part 2, A-D Part 3-4", () => {
  assert.deepEqual(plain(sanitizeListeningAnswers({ 1: "D", 7: "C", 31: "D", 32: "D", 100: "B" })),
    { 1: "D", 7: "C", 32: "D", 100: "B" });
});
test("loai du lieu hong va so cau ngoai Listening", () => {
  assert.deepEqual(plain(sanitizeListeningAnswers({ 0: "A", 101: "B", 1.5: "A", "01": "B", 2: "E", 3: null })), {});
  for (const value of [null, [], "bad"]) assert.deepEqual(plain(sanitizeListeningAnswers(value)), {});
});
test("payload dung questionNumber thay vi entity id; sap xep va khong gui cau trong", () => {
  assert.deepEqual(plain(toListeningAnswers({ 71: "C", 2: "A", 7: "D" })), [
    { questionNumber: 2, selectedOption: "A" }, { questionNumber: 71, selectedOption: "C" },
  ]);
});
test("stream di qua cung gateway va khong lap dau slash", () => {
  assert.equal(listeningStreamUrl("http://10.0.2.2:9999/api/", 2026, 1),
    "http://10.0.2.2:9999/api/exam-service/exams/2026/1/listening/audio/stream");
});


test("ban nhap Part duoc tach dung pham vi cau hoi", () => {
  const all={1:"A",6:"D",7:"C",31:"A",32:"D",70:"B",71:"C",100:"A"};
  assert.deepEqual(plain(context.exports.listeningPartAnswers(all,1)),{1:"A",6:"D"});
  assert.deepEqual(plain(context.exports.listeningPartAnswers(all,2)),{7:"C",31:"A"});
  assert.deepEqual(plain(context.exports.listeningPartAnswers(all,3)),{32:"D",70:"B"});
  assert.deepEqual(plain(context.exports.listeningPartAnswers(all,4)),{71:"C",100:"A"});
});
