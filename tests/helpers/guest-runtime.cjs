const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const axios = require("axios");
const { EventEmitter } = require("node:events");

const tick = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));

function hookRuntime() {
  let slots = [], cursor = 0, pending = [], dirty = false, component, props, output;
  const changed = (old, next) => !old || !next || old.length !== next.length || next.some((item, i) => !Object.is(item, old[i]));
  const react = {
    Fragment: "Fragment",
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, update => {
        const next = typeof update === "function" ? update(slots[index].value) : update;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
      }];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { value: { current: value } };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!(index in slots) || changed(slots[index].deps, deps)) {
        pending.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { deps, cleanup: effect() };
        });
      }
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!(index in slots) || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
  };
  function render(fn = component, value = props) {
    component = fn; props = value; cursor = 0; pending = []; dirty = false;
    output = component(props);
    pending.forEach(effect => effect());
    return output;
  }
  return {
    react, render, get output() { return output; },
    async flush() {
      for (let i = 0; i < 8; i++) {
        await tick();
        if (dirty) render();
      }
      return output;
    },
    dispose() { slots.forEach(slot => slot.cleanup?.()); slots = []; },
  };
}

function environment(extraMocks = {}) {
  const cache = new Map(), secure = new Map(), local = new Map();
  const requests = [], storageCalls = [], routerCalls = [], audioSources = [];
  const events = new EventEmitter(), hooks = hookRuntime();
  const env = {
    secure, local, requests, storageCalls, routerCalls, audioSources, hooks,
    params: {}, focused: true,
    handler: async () => ({ code: 1000, result: [] }),
  };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const native = {
    Platform: { OS: "android" },
    DeviceEventEmitter: { emit: (...args) => events.emit(...args), addListener: (name, fn) => {
      events.on(name, fn); return { remove: () => events.off(name, fn) };
    } },
    StyleSheet: { create: value => value },
    AppState: { addEventListener: () => ({ remove() {} }) },
    Text: "Text", View: "View", Modal: "Modal", Pressable: "Pressable",
    ScrollView: "ScrollView", ActivityIndicator: "ActivityIndicator", Image: "Image",
  };
  const player = { replace: source => audioSources.push(source), pause() {}, seekTo: async () => {}, play() {}, setPlaybackRate() {} };
  const colors = new Proxy({}, { get: () => "#ffffff" });
  const modules = {
    react: hooks.react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": native,
    "expo-font": { isLoaded: () => true, loadAsync: async () => {} },
    "expo-secure-store": {
      getItemAsync: async key => { storageCalls.push(["secure:get", key]); return secure.get(key) ?? null; },
      setItemAsync: async (key, value) => { storageCalls.push(["secure:set", key]); secure.set(key, value); },
      deleteItemAsync: async key => { storageCalls.push(["secure:delete", key]); secure.delete(key); },
    },
    "@react-native-async-storage/async-storage": {
      getItem: async key => { storageCalls.push(["local:get", key]); return local.get(key) ?? null; },
      setItem: async (key, value) => { storageCalls.push(["local:set", key]); local.set(key, value); },
    },
    "expo-file-system/legacy": { documentDirectory: "file:///documents/", makeDirectoryAsync: async () => {}, copyAsync: async () => {} },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "expo-audio": { setAudioModeAsync: async () => {}, useAudioPlayer: () => player,
      useAudioPlayerStatus: () => ({ isLoaded: true, currentTime: 0, playing: false }) },
    "expo-router": {
      router: { push: uri => routerCalls.push(["push", uri]), replace: uri => routerCalls.push(["replace", uri]) },
      useLocalSearchParams: () => env.params, useIsFocused: () => env.focused,
      useFocusEffect: fn => hooks.react.useEffect(() => env.focused ? fn() : undefined, [fn, env.focused]),
      Redirect: "Redirect",
    },
    "@/theme/tokens": { homeDesign: { colors, maxWidth: 500, pagePadding: 16 } },
    "@/components/ui/AppButton": { AppButton: "AppButton" },
    "../hooks/useDeviceDate": { useDeviceDate: () => "24/10/2026" },
    tamagui: { Text: "Text", YStack: "YStack", XStack: "XStack", Image: "Image" },
    axios: { ...axios, create: config => axios.create({ ...config, adapter: async request => {
      requests.push(request);
      const data = await env.handler(request);
      return { data, config: request, status: 200, statusText: "OK", headers: {} };
    } }) },
    ...extraMocks,
  };

  function load(relative) {
    let filename = path.resolve(process.cwd(), relative);
    if (!fs.existsSync(filename)) {
      if (fs.existsSync(filename + ".ts")) filename += ".ts";
      else if (fs.existsSync(filename + ".tsx")) filename += ".tsx";
      else throw new Error("Missing source " + relative);
    }
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const sourceRequire = name => {
      if (name in modules) return modules[name];
      // Native font loading is mocked; verify that the referenced Metro asset still exists.
      if (name.endsWith(".ttf")) {
        const assetPath = path.resolve(path.dirname(filename), name);
        if (!fs.existsSync(assetPath)) throw new Error("Missing font asset " + assetPath);
        return assetPath;
      }
      if (name.startsWith("@expo/vector-icons/")) return { __esModule: true, default: "Icon" };
      if (name.startsWith("@/")) return load("src/" + name.slice(2));
      if (name.startsWith(".")) return load(path.resolve(path.dirname(filename), name));
      return require(name);
    };
    vm.runInNewContext(compiled, { module, exports: module.exports, require: sourceRequire,
      process: { env: {} }, atob, decodeURIComponent, setTimeout, clearTimeout,
      setInterval, clearInterval, console }, { filename });
    return module.exports;
  }
  env.load = load;
  env.session = load("src/lib/auth/sessionStore.ts");
  env.fail = (request, status = 401) => {
    throw new axios.AxiosError("Request rejected", "ERR_BAD_RESPONSE", request, undefined,
      { data: {}, config: request, status, statusText: "Error", headers: {} });
  };
  return env;
}

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join("");
  return text(tree.props?.children);
}
function button(tree, label) {
  const node = nodes(tree).find(node => typeof node.props?.onPress === "function" && text(node).includes(label));
  if (!node) throw new Error("Button not found: " + label);
  return node;
}
module.exports = { environment, hookRuntime, tick, plain, nodes, text, button };
