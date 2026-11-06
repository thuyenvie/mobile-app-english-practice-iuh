const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, nodes, text } = require("./helpers/guest-runtime.cjs");

function policyFixture() {
  const app = environment();
  const create = app.load("features/study/utils/listeningAutoplay.ts").createListeningAutoplay;
  const policy = create();
  const events = [];
  let state = { unit: "dialogue1", generation: 1, enabled: true, ready: true, active: true,
    start: () => events.push("play"), stop: () => events.push("pause") };
  const update = patch => { state = { ...state, ...patch }; policy.update(state); };
  return { app, policy, events, update };
}
test("ON starts once per audio unit; same dialogue and revisiting never restart", () => {
  const f = policyFixture(); f.update({}); f.policy.focus();
  f.update({}); f.update({}); assert.equal(f.events.filter(e => e === "play").length, 1);
  f.update({ unit: "dialogue2" }); assert.equal(f.events.filter(e => e === "play").length, 2);
  f.update({ unit: "dialogue1" }); assert.equal(f.events.filter(e => e === "play").length, 2);
  f.policy.dispose();
});
test("OFF keeps manual playback available and switching ON does not surprise-play the current unit", () => {
  const f = policyFixture(); f.update({ enabled: false }); f.policy.focus();
  assert.ok(!f.events.includes("play")); assert.equal(f.policy.manual(), true);
  f.update({ enabled: true }); assert.ok(!f.events.includes("play"));
  f.update({ unit: "next" }); assert.equal(f.events.filter(e => e === "play").length, 1);
  f.policy.dispose();
});
test("slow load waits for readiness; manual pause before readiness consumes auto", () => {
  const f = policyFixture(); f.update({ ready: false }); f.policy.focus();
  f.policy.cancel(); f.update({ ready: true }); assert.ok(!f.events.includes("play"));
  f.update({ unit: "next", ready: false }); assert.ok(!f.events.includes("play"));
  f.update({ ready: true }); assert.equal(f.events.filter(e => e === "play").length, 1);
  f.policy.dispose();
});
for (const interruption of ["blur", "background", "modal", "submit/Reading", "session"]) test(interruption + " cancels pending seek/delay and never auto-resumes", async () => {
  const f = policyFixture();
  const scheduler = f.app.load("features/study/utils/playbackScheduler.ts").createPlaybackScheduler();
  let resolveSeek, pending;
  f.update({ start: () => { pending = scheduler.schedule(() => new Promise(resolve => { resolveSeek = resolve; }), () => f.events.push("late-play"), 0); }, stop: () => scheduler.cancel() });
  f.policy.focus();
  if (interruption === "blur") { f.policy.blur(); f.policy.focus(); }
  if (interruption === "background") { f.policy.foreground(false); f.policy.foreground(true); }
  if (interruption === "modal" || interruption === "submit/Reading") { f.update({ active: false }); f.update({ active: true }); }
  if (interruption === "session") f.update({ generation: 2 });
  resolveSeek(); await pending; f.update({});
  assert.ok(!f.events.includes("late-play")); f.policy.dispose();
});
test("a second player takes ownership and pauses the previous player", () => {
  const f = policyFixture(); f.update({}); f.policy.focus();
  const before = f.events.length;
  const create = f.app.load("features/study/utils/listeningAutoplay.ts").createListeningAutoplay;
  const other = create(); other.update({ unit: "other", generation: 1, enabled: true, ready: true, active: true, start() {}, stop() {} }); other.focus();
  assert.equal(f.events[before], "pause"); other.dispose(); f.policy.dispose();
});
test("blocked Web autoplay is attempted once; a manual retry remains available", () => {
  const f = policyFixture(); let attempts = 0;
  f.update({ start: () => { attempts++; /* SDK reports blocked playback through status/UI. */ } });
  f.policy.focus(); f.update({}); assert.equal(attempts, 1); assert.equal(f.policy.manual(), true); f.policy.dispose();
});

test("unit history survives player remount after Reading without starting the old unit again", () => {
  const app = environment();
  const create = app.load("features/study/utils/listeningAutoplay.ts").createListeningAutoplay;
  const history = new Set(); let plays = 0;
  const state = { unit: "same-unit", generation: 1, ready: true, enabled: true, active: true, start: () => { plays++; }, stop() {} };
  const first = create(true, history); first.update(state); first.focus(); first.dispose();
  const second = create(true, history); second.update(state); second.focus();
  assert.equal(plays, 1); second.dispose();
});

test("cancelling a preparation-delay timer after seek prevents late play", async () => {
  const app = environment(), scheduler = app.load("features/study/utils/playbackScheduler.ts").createPlaybackScheduler();
  let plays = 0; await scheduler.schedule(async () => {}, () => { plays++; }, 10);
  assert.equal(scheduler.getSnapshot(), true); scheduler.cancel();
  await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(plays, 0);
});

test("Settings toggle waits for acknowledged persist and reports write failure without pretending saved", async () => {
  const app = environment(); let resolve, fail = false;
  const settings = { preferences: { listeningAutoplay: true }, hydration: "ready", persistence: "idle", updateSettings: patch => new Promise((done, reject) => { resolve = () => { if (fail) reject(Error("fixture")); else { settings.preferences = patch; done(); } }; }) };
  const theme = Object.fromEntries(["surface", "border", "text", "muted", "error"].map(k => [k, "#000"]));
  const Entry = app.load("features/settings/entries/SET02Entry.tsx").SET02Entry;
  const render = () => app.hooks.render(Entry, { settings, theme });
  render(); nodes(app.hooks.output).find(n => n.type === "Switch").props.onValueChange(false);
  await app.hooks.flush(); assert.equal(nodes(app.hooks.output).find(n => n.type === "Switch").props.value, true);
  resolve(); await app.hooks.flush(); assert.equal(nodes(app.hooks.output).find(n => n.type === "Switch").props.value, false);
  fail = true; nodes(app.hooks.output).find(n => n.type === "Switch").props.onValueChange(true); resolve(); await app.hooks.flush();
  assert.match(text(app.hooks.output), /Chưa lưu/); assert.equal(settings.preferences.listeningAutoplay, false);
  settings.hydration = "loading"; render(); assert.equal(nodes(app.hooks.output).find(n => n.type === "Switch").props.disabled, true); app.hooks.dispose();
});

test("actual Practice player waits for preparation/seek and manual pause defeats late playback", async () => {
  let app, resolveMode, resolveSeek, plays = 0;
  const player = { replace() {}, pause() {}, seekTo: () => new Promise(resolve => { resolveSeek = resolve; }), play: () => { plays++; }, setPlaybackRate() {} };
  app = environment({ "expo-audio": { setAudioModeAsync: () => new Promise(resolve => { resolveMode = resolve; }), useAudioPlayer: () => player, useAudioPlayerStatus: () => ({ isLoaded: true, currentTime: 0, playing: false }) } });
  const Player = app.load("features/study/components/PracticeAudioPlayer.tsx").PracticeAudioPlayer;
  const audio = { segmentId: 1, audioUrl: "/audio", startTime: 10, endTime: 20, firstQuestionNumber: 1, lastQuestionNumber: 3 };
  app.hooks.render(Player, { audio, activeQuestionNumber: 1, paused: false }); await app.hooks.flush();
  assert.equal(plays, 0); resolveMode(); await app.hooks.flush(); assert.equal(typeof resolveSeek, "function");
  const Control = nodes(app.hooks.output).find(n => n.props.label === "Phát hoặc tạm dừng");
  Control.props.onPress(); resolveSeek(); await app.hooks.flush(); assert.equal(plays, 0);
  app.hooks.dispose();
});

for (const enabled of [true, false]) test("actual Full Test starts once after Begin, retains manual play and never resumes on focus, ON=" + enabled, async () => {
  let plays = 0, pauses = 0;
  const status = { isLoaded: true, currentTime: 0, playing: false };
  const player = { replace() {}, pause() { pauses++; status.playing = false; }, play() { plays++; status.playing = true; } };
  const app = environment({
    "expo-audio": { setAudioModeAsync: async () => {}, useAudioPlayer: () => player, useAudioPlayerStatus: () => status },
    "@/providers/SettingsProvider": { useSettings: () => ({ preferences: { listeningAutoplay: enabled }, hydration: "ready" }) },
  });
  app.params = { year: "2026", testNumber: "1" };
  const ranges = [[1, 6], [7, 31], [32, 70], [71, 100], [101, 130], [131, 146], [147, 200]];
  app.handler = async request => {
    const match = request.url.match(/\/parts\/([1-7])$/);
    if (match) {
      const partNumber = Number(match[1]), [first, last] = ranges[partNumber - 1];
      return { code: 1000, result: { year: 2026, testNumber: 1, partNumber, type: partNumber <= 4 ? "LISTENING" : "READING", passages: [],
        questions: Array.from({ length: last - first + 1 }, (_, index) => ({ id: first + index, questionNumber: first + index, content: "fixture", passageId: null, options: [{ label: "A", text: "fixture" }] })) } };
    }
    return { code: 1000, result: { streamPath: "/exams/2026/1/listening/audio/stream" } };
  };
  const Screen = app.load("features/study/screens/FullTestScreen.tsx").default;
  const render = () => app.hooks.render(Screen, {});
  const action = title => { const node = nodes(app.hooks.output).find(n => n.props.title === title && n.props.onPress); assert.ok(node, title); node.props.onPress(); };
  render(); await app.hooks.flush(); assert.equal(plays, 0);
  action("Bắt đầu làm bài · 120 phút"); await app.hooks.flush(); assert.equal(plays, enabled ? 1 : 0);
  render();
  if (enabled) action("Tạm dừng audio");
  render(); action("Phát / tiếp tục"); assert.equal(plays, enabled ? 2 : 1);
  app.focused = false; render(); assert.ok(pauses > 0);
  app.focused = true; render(); await app.hooks.flush(); assert.equal(plays, enabled ? 2 : 1);
  assert.equal(app.requests.filter(r => /\/parts\/[1-7]$/.test(r.url)).length, 7);
  app.hooks.dispose();
});
