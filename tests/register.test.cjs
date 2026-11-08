const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AxiosError } = require("axios");
const { environment, nodes, button, text, plain, tick } = require("./helpers/guest-runtime.cjs");

function fixture() {
  const app = environment();
  app.session.enterGuestSession();
  const Screen = app.load("features/auth/screens/RegisterScreen.tsx").default;
  app.hooks.render(Screen);
  const input = label => nodes(app.hooks.output).find(n => n.props.label === label);
  const fill = (label, value) => { input(label).props.onChangeText(value); app.hooks.render(); };
  const password = randomUUID();
  const valid = () => {
    fill("Họ và tên", " Nguyễn  Văn An "); fill("Email", " New.User@Example.com ");
    fill("Mật khẩu", password); fill("Xác nhận mật khẩu", password);
  };
  return { app, fill, input, valid, password, submit: () => button(app.hooks.output, "Đăng ký").props.onPress() };
}

test("Register validates required fields, email, password limits and matching confirmation", async () => {
  const { app, fill, valid, submit } = fixture();
  await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /nhập họ và tên/);
  fill("Họ và tên", "An"); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /nhập email/);
  fill("Email", "a@b"); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /Email không hợp lệ/);
  valid(); fill("Mật khẩu", "x".repeat(7)); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /8 đến 72/);
  fill("Mật khẩu", "ế".repeat(25)); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /72 byte/);
  valid(); fill("Xác nhận mật khẩu", ""); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /xác nhận mật khẩu/);
  fill("Xác nhận mật khẩu", "different"); await submit(); await app.hooks.flush(); assert.match(text(app.hooks.output), /không trùng khớp/);
  assert.equal(app.requests.length, 0);
});

test("Register validates name/email maximum lengths and preserves password whitespace", () => {
  const app = environment();
  const validate = app.load("features/auth/utils/registerValidation.ts").validateRegisterForm;
  const form = { fullName: "An", email: "an@example.com", password: "  abcdefgh  ", confirmPassword: "  abcdefgh  " };
  assert.equal(validate(form), null);
  assert.match(validate({ ...form, fullName: "x".repeat(101) }), /100/);
  assert.match(validate({ ...form, email: "x".repeat(255) + "@example.com" }), /Email/);
  assert.match(validate({ ...form, email: "á@example.com" }), /Email/);
  assert.match(validate({ ...form, password: "x".repeat(73) }), /8 đến 72/);
});

test("Register loading blocks immediate double submit, normalizes email, returns to Login without changing Guest or storage", async () => {
  const { app, valid, submit, input } = fixture();
  valid();
  const before = app.session.getSessionSnapshot();
  let complete;
  app.handler = () => new Promise(resolve => { complete = resolve; });
  const first = submit(); const second = submit(); await tick(); await app.hooks.flush();
  assert.equal(app.requests.length, 1);
  assert.equal(button(app.hooks.output, "Đang đăng ký").props.disabled, true);
  assert.equal(input("Email").props.disabled, true);
  assert.equal(input("Mật khẩu").props.secureTextEntry, true);
  assert.equal(input("Xác nhận mật khẩu").props.secureTextEntry, true);
  assert.equal(app.requests[0].headers.get("Authorization"), undefined);
  const body = JSON.parse(app.requests[0].data);
  assert.equal(body.email, "new.user@example.com"); assert.equal(body.fullName, "Nguyễn Văn An");
  assert.equal(body.confirmPassword, undefined);
  complete({ code: 201, success: true, result: { userName: body.email } });
  await Promise.all([first, second]); await app.hooks.flush();
  assert.deepEqual(plain(app.routerCalls), [["replace", { pathname: "/auth/login", params: { registered: "1" } }]]);
  assert.equal(app.session.getSessionSnapshot(), before);
  assert.equal(app.secure.size, 0); assert.equal(app.storageCalls.length, 0);
});

for (const status of [409, 400, 503, null, 401]) test(`Register shows API/network error and permits retry: ${status}`, async () => {
  const { app, valid, submit } = fixture(); valid();
  app.handler = async request => {
    throw new AxiosError("Failed", "ERR_NETWORK", request, undefined, status ? {
      status, data: { code: 1002, message: "Dữ liệu email không hợp lệ" }, config: request,
    } : undefined);
  };
  await submit(); await app.hooks.flush();
  assert.match(text(app.hooks.output), status === 409 ? /Email đã tồn tại/ : status === 400 ? /Dữ liệu email không hợp lệ/ : status === null ? /kết nối/ : /thử lại sau/);
  assert.equal(button(app.hooks.output, "Đăng ký").props.disabled, false);
  assert.equal(app.routerCalls.length, 0); assert.equal(app.requests.length, 1);
  assert.equal(app.session.getSessionSnapshot().status, "guest");
});

test("Login/Register navigation and registration success notice", () => {
  const { app } = fixture();
  button(app.hooks.output, "Đăng nhập").props.onPress();
  assert.deepEqual(plain(app.routerCalls), [["replace", "/auth/login"]]);
  const login = environment({
    "../hooks/useGoogleLogin": { useGoogleLogin: () => ({}) },
    "../components/GoogleButton": { GoogleButton: "GoogleButton" },
  });
  login.params = { registered: "1" };
  const tree = login.hooks.render(login.load("features/auth/screens/LoginScreen.tsx").default);
  assert.match(text(tree), /Đăng ký thành công/);
  button(tree, "Đăng ký").props.onPress();
  assert.deepEqual(plain(login.routerCalls), [["push", "/auth/register"]]);
});

test("Register ignores late completion after unmount and preserves existing authenticated credentials", async () => {
  const { app, valid, submit } = fixture(); valid();
  app.session.authenticateSession("existing@example.com");
  app.secure.set("accessToken", "existing-test-fixture");
  const before = app.session.getSessionSnapshot();
  let complete; app.handler = () => new Promise(resolve => { complete = resolve; });
  const pending = submit(); await tick(); app.hooks.dispose();
  complete({ code: 201, success: true, result: { userName: "new@example.com" } });
  await pending;
  assert.equal(app.routerCalls.length, 0); assert.equal(app.session.getSessionSnapshot(), before);
  assert.equal(app.secure.get("accessToken"), "existing-test-fixture");
  assert.equal(app.requests[0].headers.get("Authorization"), undefined);
});
