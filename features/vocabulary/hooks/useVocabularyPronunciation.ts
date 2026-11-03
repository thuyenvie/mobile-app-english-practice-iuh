import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Speech from "expo-speech";

let audioModeSetup: Promise<void> | null = null;

function prepareAudioMode() {
  if (!audioModeSetup) {
    audioModeSetup = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch((cause: unknown) => {
      audioModeSetup = null;
      throw cause;
    });
  }
  return audioModeSetup;
}

export function useVocabularyPronunciation() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const loadedUrl = useRef<string | null>(null);
  const pendingUrl = useRef<string | null>(null);
  const lastPlayerError = useRef<string | null>(null);
  const fallbackStartedForUrl = useRef<string | null>(null);
  const requestId = useRef(0);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackSpeaking, setFallbackSpeaking] = useState(false);
  const [activeWord, setActiveWord] = useState("");

  useEffect(() => {
    void prepareAudioMode().catch(() => {
      // Neu khong the chuan bi audio, lan bam loa se tu doc bang giong thiet bi.
    });
  }, []);

  const pauseSafely = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Bo qua neu player native da duoc giai phong.
    }
  }, [player]);

  const speakWithDeviceVoice = useCallback((word: string, sourceUrl: string | null, request: number) => {
    if (!word) return;
    pendingUrl.current = null;
    setLoading(false);
    pauseSafely();
    fallbackStartedForUrl.current = sourceUrl;
    setFallbackSpeaking(true);
    try {
      Speech.stop();
      Speech.speak(word, {
        language: "en-US",
        onDone: () => {
          if (request !== requestId.current) return;
          setFallbackSpeaking(false);
        },
        onStopped: () => {
          if (request === requestId.current) setFallbackSpeaking(false);
        },
        onError: () => {
          if (request !== requestId.current) return;
          setFallbackSpeaking(false);
          setError("Không phát được audio mẫu hoặc giọng đọc thiết bị.");
        },
      });
    } catch {
      if (request !== requestId.current) return;
      setFallbackSpeaking(false);
      setError("Không khởi động được giọng đọc thiết bị.");
    }
  }, [pauseSafely]);

  const stop = useCallback(() => {
    requestId.current += 1;
    pauseSafely();
    Speech.stop();
    pendingUrl.current = null;
    setActiveUrl(null);
    setActiveWord("");
    setLoading(false);
    setFallbackSpeaking(false);
    setError("");
  }, [pauseSafely]);

  const play = useCallback(async (audioUrl: string | null | undefined, word: string) => {
    const request = ++requestId.current;
    setError("");
    setActiveWord(word);

    if (fallbackSpeaking && activeWord === word) {
      Speech.stop();
      setFallbackSpeaking(false);
      return;
    }

    if (audioUrl && activeUrl === audioUrl && status.playing) {
      pauseSafely();
      return;
    }

    // Dung tu truoc va bo ket qua cu moi khi chon mot tu khac.
    pauseSafely();
    Speech.stop();
    setFallbackSpeaking(false);
    pendingUrl.current = null;
    fallbackStartedForUrl.current = null;

    if (!audioUrl) {
      setActiveUrl(null);
      speakWithDeviceVoice(word, null, request);
      return;
    }

    setActiveUrl(audioUrl);
    setLoading(true);
    try {
      await prepareAudioMode();
      if (request !== requestId.current) return;
      if (loadedUrl.current === audioUrl && status.isLoaded) {
        if (status.didJustFinish) await player.seekTo(0);
        player.play();
        setLoading(false);
        return;
      }

      pendingUrl.current = audioUrl;
      lastPlayerError.current = status.error || null;
      loadedUrl.current = audioUrl;
      player.replace({ uri: audioUrl });
    } catch {
      if (request !== requestId.current) return;
      loadedUrl.current = null;
      speakWithDeviceVoice(word, audioUrl, request);
    }
  }, [activeUrl, activeWord, fallbackSpeaking, pauseSafely, player, speakWithDeviceVoice, status.didJustFinish, status.error, status.isLoaded, status.playing]);

  useEffect(() => {
    if (!status.error) lastPlayerError.current = null;
    if (status.isLoaded && pendingUrl.current === activeUrl && activeUrl) {
      pendingUrl.current = null;
      setLoading(false);
      try {
        player.play();
      } catch {
        loadedUrl.current = null;
        speakWithDeviceVoice(activeWord, activeUrl, requestId.current);
      }
    }

    if (
      status.error &&
      status.error !== lastPlayerError.current &&
      activeUrl &&
      pendingUrl.current === activeUrl
    ) {
      pendingUrl.current = null;
      loadedUrl.current = null;
      setLoading(false);
      lastPlayerError.current = status.error;
      if (fallbackStartedForUrl.current !== activeUrl) {
        speakWithDeviceVoice(activeWord, activeUrl, requestId.current);
      }
    }
  }, [activeUrl, activeWord, player, speakWithDeviceVoice, status.error, status.isLoaded]);

  useEffect(() => {
    if (!loading || !activeUrl) return;
    const timeout = setTimeout(() => {
      if (pendingUrl.current !== activeUrl) return;
      pendingUrl.current = null;
      loadedUrl.current = null;
      setLoading(false);
      speakWithDeviceVoice(activeWord, activeUrl, requestId.current);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [activeUrl, activeWord, loading, speakWithDeviceVoice]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        pauseSafely();
        Speech.stop();
        setFallbackSpeaking(false);
      }
    });
    return () => subscription.remove();
  }, [pauseSafely]);

  useEffect(() => () => {
    pauseSafely();
    Speech.stop();
  }, [pauseSafely]);

  return {
    activeUrl,
    activeWord,
    playing: status.playing || fallbackSpeaking,
    loading:
      fallbackSpeaking ||
      (!error && loading) ||
      (!status.error && !error && status.isBuffering),
    error,
    play,
    stop,
  };
}
