import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useFocusEffect } from "expo-router";

import { getAccessToken } from "@/lib/auth/tokenStorage";
import { API_BASE_URL } from "@/lib/axios/axios";
import { homeDesign } from "@/theme/tokens";
import type { QuestionAudioSegment } from "../types";

type Props = {
  audio: QuestionAudioSegment | null;
  activeQuestionNumber: number;
  paused: boolean;
};

const SPEEDS = [0.8, 1, 1.2, 1.5];

/** Plays one approved question/dialogue range from the test's protected MP3 stream. */
export function PracticeAudioPlayer({ audio, activeQuestionNumber, paused }: Props) {
  const player = useAudioPlayer(null, { updateInterval: 150 });
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [trackWidth, setTrackWidth] = useState(0);
  const activeQuestionRef = useRef(activeQuestionNumber);
  const pauseSafely = useCallback(() => {
    try {
      // Expo Audio can release the native shared object before navigation cleanup runs.
      player.pause();
    } catch {
      // Already released: there is no native audio left to stop.
    }
  }, [player]);

  const start = audio?.startTime ?? 0;
  const end = audio?.endTime ?? 0;
  const duration = Math.max(0, end - start);
  const segmentProgress = duration > 0
    ? Math.max(0, Math.min(1, (status.currentTime - start) / duration))
    : 0;
  const streamUrl = audio ? toAbsoluteUrl(audio.audioUrl || audio.streamPath) : "";

  useEffect(() => {
    let cancelled = false;
    if (!audio || !streamUrl) {
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    (async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Vui lòng đăng nhập lại để nghe audio.");
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (cancelled) return;

      // API stream is protected, so the native audio request must include the same JWT as Axios.
      player.replace({ uri: streamUrl, headers: { Authorization: `Bearer ${token}` } });
    })().catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được audio.");
    });

    return () => {
      cancelled = true;
      pauseSafely();
      // useAudioPlayer releases its native AudioPlayer automatically on unmount.
    };
  }, [audio?.audioUrl, audio?.streamPath, attempt, pauseSafely, player, streamUrl]);

  useEffect(() => {
    if (status.isLoaded || status.error) setLoading(false);
  }, [status.error, status.isLoaded]);

  useEffect(() => {
    // The current question may change inside a 3-question dialogue; stop so audio never overlaps.
    if (activeQuestionRef.current !== activeQuestionNumber) pauseSafely();
    activeQuestionRef.current = activeQuestionNumber;
  }, [activeQuestionNumber, pauseSafely]);

  useEffect(() => {
    if (paused || !audio) pauseSafely();
  }, [audio, paused, pauseSafely]);

  useEffect(() => {
    if (audio && status.playing && status.currentTime >= end) {
      pauseSafely();
      void player.seekTo(end);
    }
  }, [audio, end, pauseSafely, player, status.currentTime, status.playing]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") pauseSafely();
    });
    return () => subscription.remove();
  }, [pauseSafely]);

  useFocusEffect(useCallback(() => () => pauseSafely(), [pauseSafely]));

  const seekWithinSegment = async (time: number) => {
    if (!audio || !status.isLoaded) return;
    const bounded = Math.max(start, Math.min(end, time));
    try {
      await player.seekTo(bounded);
    } catch {
      setError("Không tua được audio. Hãy thử tải lại.");
    }
  };

  const togglePlayback = async () => {
    if (!audio || loading || !status.isLoaded) return;
    if (status.playing) {
      pauseSafely();
      return;
    }
    try {
      if (status.currentTime < start || status.currentTime >= end) await player.seekTo(start);
      player.play();
    } catch {
      setError("Không phát được audio. Hãy thử tải lại.");
    }
  };

  const changeSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    player.setPlaybackRate(SPEEDS[nextIndex], "high");
  };

  const seekFromProgress = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);
  const onProgressPress = (event: GestureResponderEvent) => {
    if (trackWidth <= 0 || duration <= 0) return;
    void seekWithinSegment(start + (event.nativeEvent.locationX / trackWidth) * duration);
  };

  if (!audio) {
    return <View style={styles.box}>
      <Text style={styles.title}>Audio luyện tập</Text>
      <Text style={styles.note}>Chưa có đoạn audio được duyệt cho câu hoặc nhóm câu này.</Text>
    </View>;
  }

  return <View style={styles.box}>
    <View style={styles.heading}>
      <View style={styles.copy}>
        <Text style={styles.title}>Luyện nghe · Câu {audio.firstQuestionNumber}{audio.lastQuestionNumber !== audio.firstQuestionNumber ? `–${audio.lastQuestionNumber}` : ""}</Text>
        <Text style={styles.note}>Đang xem câu {activeQuestionNumber}</Text>
      </View>
      {loading || status.isBuffering ? <ActivityIndicator color={homeDesign.colors.link} /> : null}
    </View>

    {error || status.error ? <>
      <Text style={styles.error}>{error || "Không tải được audio. Kiểm tra kết nối hoặc đăng nhập lại."}</Text>
      <Pressable accessibilityRole="button" onPress={() => { pauseSafely(); setError(""); setLoading(true); setAttempt(value => value + 1); }}>
        <Text style={styles.link}>Tải lại audio</Text>
      </Pressable>
    </> : <>
      <Pressable accessibilityRole="progressbar" accessibilityLabel="Tiến trình đoạn audio" onLayout={seekFromProgress} onPress={onProgressPress} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${segmentProgress * 100}%` }]} />
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.note}>{formatTime(Math.max(0, status.currentTime - start))} / {formatTime(duration)}</Text>
        <Pressable accessibilityRole="button" disabled={loading || !status.isLoaded} onPress={changeSpeed} style={styles.smallButton}>
          <Text style={styles.controlText}>{SPEEDS[speedIndex]}×</Text>
        </Pressable>
      </View>
      <View style={styles.controls}>
        <Control label="Tua lùi 5 giây" text="−5s" disabled={loading || !status.isLoaded} onPress={() => void seekWithinSegment(status.currentTime - 5)} />
        <Control label="Phát hoặc tạm dừng" text={status.playing ? "Tạm dừng" : "Phát"} disabled={loading || !status.isLoaded} onPress={() => void togglePlayback()} primary />
        <Control label="Tua tới 5 giây" text="+5s" disabled={loading || !status.isLoaded} onPress={() => void seekWithinSegment(status.currentTime + 5)} />
        <Control label="Phát lại đoạn audio" text="Phát lại" disabled={loading || !status.isLoaded} onPress={() => void seekWithinSegment(start).then(() => { if (!paused) player.play(); })} />
      </View>
    </>}
  </View>;
}

function Control({ label, text, disabled, onPress, primary = false }: {
  label: string; text: string; disabled: boolean; onPress: () => void; primary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={[styles.button, primary && styles.primary, disabled && styles.disabled]}>
    <Text style={styles.controlText}>{text}</Text>
  </Pressable>;
}

function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Gateway mounts exam-service below /api/exam-service; backend streamPath starts at /exams.
  const servicePath = normalizedPath.startsWith("/exam-service/")
    ? normalizedPath
    : `/exam-service${normalizedPath}`;
  return `${API_BASE_URL.replace(/\/+$/, "")}${servicePath}`;
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const colors = homeDesign.colors;
const styles = StyleSheet.create({
  box: { padding: 12, gap: 10, backgroundColor: colors.surface, borderRadius: 12 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  copy: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: "700" },
  note: { color: colors.secondary, fontSize: 12 },
  error: { color: colors.inProgress, fontSize: 13 },
  link: { color: colors.link, paddingVertical: 6, fontWeight: "600" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.border },
  progressFill: { height: "100%", backgroundColor: colors.link },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 40, justifyContent: "center", paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.surfaceRaised },
  primary: { backgroundColor: colors.link },
  smallButton: { minHeight: 34, minWidth: 54, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: colors.surfaceRaised },
  controlText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.45 },
});
