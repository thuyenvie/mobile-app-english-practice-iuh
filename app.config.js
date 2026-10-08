const IOS_CLIENT_ID_PATTERN =
  /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
  const googleSignInPlugin = "@react-native-google-signin/google-signin";
  // Loại bỏ cấu hình cũ (nếu có) để plugin chỉ xuất hiện đúng một lần.
  const plugins = (config.plugins ?? []).filter((plugin) => {
    if (typeof plugin === "string") return plugin !== googleSignInPlugin;
    return plugin[0] !== googleSignInPlugin;
  });

  // FIX Android: plugin phải luôn có trong native build, kể cả chưa cấu hình iOS.
  // Android được Google nhận diện bằng package name + SHA-1.
  if (IOS_CLIENT_ID_PATTERN.test(iosClientId)) {
    const clientIdPrefix = iosClientId.replace(
      ".apps.googleusercontent.com",
      "",
    );
    plugins.push([
      googleSignInPlugin,
      { iosUrlScheme: `com.googleusercontent.apps.${clientIdPrefix}` },
    ]);
  } else {
    plugins.push(googleSignInPlugin);
  }

  // Chi phat audio, khong xin quyen micro.
  if (!plugins.some((plugin) => (typeof plugin === "string" ? plugin : plugin[0]) === "expo-audio")) {
    plugins.push(["expo-audio", { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }]);
  }
  return { ...config, plugins };
};
