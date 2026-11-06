import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useCallback, useEffect, useRef, useState } from "react";

import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useFocusEffect } from "expo-router";
import { API_BASE_URL } from "@/lib/axios/axios";
import { getExamErrorMessage } from "../api/examApi";
import { getListeningAudio, getQuestionAudio, type QuestionAudio } from "../api/listeningApi";

import { listeningStreamUrl } from "../utils/listening";

export function ListeningAudioPlayer({ year, test, question, paused }: { year: number; test: number; question: number; paused: boolean }) {
  const { styles } = useThemedStyles();
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState("");
  const [rangeState, setRangeState] = useState<{ question: number; range: QuestionAudio | null; notice: string } | null>(null);
  const range = rangeState?.question === question ? rangeState.range : null;
  const rangeNotice = rangeState?.question === question ? rangeState.notice : "Đang kiểm tra mốc nghe...";
  const [mode, setMode] = useState<"full" | "question">("full");
  const modeRef = useRef<"full" | "question">("full");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (Platform.OS === "web") throw new Error("Player này dành cho Android/iOS. Hãy mở ứng dụng native để nghe.");
      await getListeningAudio(year, test);
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (!active) return;
      // Public audio source does not require account credentials.
      player.replace({
        uri: listeningStreamUrl(API_BASE_URL, year, test),
      });
    })().catch(e => { if (active) setError(getExamErrorMessage(e)); });
    return () => { active = false; };
  }, [year, test, player, attempt]);

  useEffect(() => {
    let active = true;
    getQuestionAudio(year, test, question).then(value => {
      if (active) setRangeState({ question, range: value, notice: "" });
    }).catch(e => {
      if (active) setRangeState({ question, range: null, notice: e?.response?.status === 404
        ? "Chưa có mốc đã duyệt cho câu này. Bạn vẫn có thể nghe toàn bài."
        : getExamErrorMessage(e) });
    });
    return () => { active = false; };
  }, [year, test, question, attempt]);

  useEffect(() => { if (modeRef.current === "question") player.pause(); }, [question, player]);
  useEffect(() => {
    if (mode === "question" && range && status.currentTime >= range.endMs / 1000) player.pause();
  }, [status.currentTime, mode, range, player]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") player.pause(); });
    return () => subscription.remove();
  }, [player]);
  useFocusEffect(useCallback(() => () => player.pause(), [player]));
  useEffect(() => { if (paused) player.pause(); }, [paused, player]);
  useEffect(() => {
    if (status.isLoaded || error) return;
    const timeout = setTimeout(() => setError("Audio tải quá lâu. Kiểm tra mạng, token và thử tải lại."), 20000);
    return () => clearTimeout(timeout);
  }, [status.isLoaded, error, attempt]);

  const play = async (segment: boolean) => {
    if (busy || !status.isLoaded || (segment && !range)) return;
    setBusy(true);
    try {
      player.pause();
      modeRef.current = segment ? "question" : "full";
      setMode(segment ? "question" : "full");
      if (segment && range) await player.seekTo(range.startMs / 1000, 0, 0);
      else if (status.didJustFinish) await player.seekTo(0);
      player.play();
    } catch { setError("Không phát được audio. Hãy thử tải lại."); }
    finally { setBusy(false); }
  };
  const seek = async (seconds: number) => {
    try {
      player.pause();
      modeRef.current = "full";
      setMode("full");
      await player.seekTo(Math.max(0, Math.min(status.duration, seconds)), 0, 0);
    } catch { setError("Không tua được audio. Hãy thử tải lại."); }
  };
  return <View style={styles.box}>
    <Text style={styles.text}>Audio toàn Test · {formatTime(status.currentTime)} / {formatTime(status.duration)}</Text>
    {error || status.error ? <><Text style={styles.note}>{error || "Không tải được audio. Kiểm tra kết nối và đăng nhập lại nếu token hết hạn."}</Text><Pressable onPress={() => { player.pause(); setError(""); setAttempt(n => n + 1); }}><Text style={styles.link}>Tải lại audio</Text></Pressable></> : <>
      <View style={styles.row}>
        <Pressable disabled={!status.isLoaded || busy} onPress={() => status.playing ? player.pause() : void play(false)} style={styles.button}>
          <Text style={styles.text}>{status.isBuffering ? "Đang tải..." : status.playing ? "Tạm dừng" : "Nghe toàn bài"}</Text>
        </Pressable>
        <Pressable disabled={!range || !status.isLoaded || busy} onPress={() => void play(true)} style={[styles.button, !range && { opacity: 0.4 }]}>
          <Text style={styles.text}>Nghe lại {range ? `${range.firstQuestionNumber}–${range.lastQuestionNumber}` : "câu"}</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {[{ label: "−10 giây", time: status.currentTime - 10 }, { label: "Về đầu bài", time: 0 }, { label: "+10 giây", time: status.currentTime + 10 }].map(item =>
          <Pressable key={item.label} accessibilityRole="button" disabled={!status.isLoaded || busy} onPress={() => void seek(item.time)}>
            <Text style={styles.link}>{item.label}</Text>
          </Pressable>)}
      </View>
      {rangeNotice ? <Text style={styles.note}>{rangeNotice}</Text> : null}
    </>}
  </View>;
}
function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}


function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const styles = StyleSheet.create({
      box: { padding: 12, gap: 8, backgroundColor: homeDesign.colors.surface },
      row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
      button: { padding: 12, borderRadius: 10, backgroundColor: homeDesign.colors.surfaceRaised },
      text: { color: homeDesign.colors.text, fontSize: 14 },
      note: { color: homeDesign.colors.inProgress, fontSize: 12 },
      link: { color: homeDesign.colors.link, padding: 8 },
    });
    return { homeDesign, styles };
  }, [appTheme]);
}
