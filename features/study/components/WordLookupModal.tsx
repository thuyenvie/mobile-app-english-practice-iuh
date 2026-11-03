import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { homeDesign } from "@/theme/tokens";
import type { DictionaryLookup } from "../api/dictionaryApi";
import { PhoneticText } from "./PhoneticText";

export function WordLookupModal({
  visible,
  loading,
  error,
  entry,
  word,
  onClose,
  onRetry,
  saved = false,
  saving = false,
  saveError = "",
  onSave,
}: {
  visible: boolean;
  loading: boolean;
  error: string;
  entry: DictionaryLookup | null;
  word: string;
  onClose: () => void;
  onRetry: () => void;
  saved?: boolean;
  saving?: boolean;
  saveError?: string;
  onSave?: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng tra từ" />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.word}>{entry?.word ?? word}</Text>
              {entry?.phonetic ? (
                <PhoneticText style={styles.phonetic}>{entry.phonetic}</PhoneticText>
              ) : entry ? (
                <Text style={styles.phoneticUnavailable}>Nguồn từ điển chưa có phiên âm cho từ này.</Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Đóng">
              <MaterialIcons name="close" size={25} color={homeDesign.colors.secondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={homeDesign.colors.link} />
              <Text style={styles.secondary}>Đang tra nghĩa...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.error}>{error}</Text>
              <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
                <Text style={styles.retryText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : entry ? (
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.body}>
                  {entry.partOfSpeech ? <Text style={styles.partOfSpeech}>{entry.partOfSpeech}</Text> : null}
                  <Text style={styles.sectionLabel}>Nghĩa tiếng Việt</Text>
                  <Text style={styles.translation}>{entry.vietnameseMeaning}</Text>
                  <Text style={styles.sectionLabel}>English definition</Text>
                  <Text style={styles.definition}>{entry.englishDefinition}</Text>
                  {entry.example ? (
                    <>
                      <Text style={styles.sectionLabel}>Ví dụ</Text>
                      <Text style={styles.example}>{entry.example}</Text>
                    </>
                  ) : null}
                  <Text style={styles.source}>Nguồn dữ liệu: Free Dictionary API</Text>
              </View>
            </ScrollView>
          ) : null}

          {entry && onSave ? (
            <View style={styles.saveBlock}>
              {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              <Pressable
                onPress={onSave}
                disabled={saved || saving}
                style={[styles.saveButton, saved && styles.savedButton]}
                accessibilityRole="button"
              >
                {saving ? <ActivityIndicator color="#111111" /> : (
                  <Text style={styles.saveButtonText}>{saved ? "Đã lưu vào Từ vựng" : "Lưu từ này"}</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button">
            <Text style={styles.closeButtonText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: homeDesign.colors.surface,
    borderColor: homeDesign.colors.border,
    borderWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  titleGroup: { flex: 1, gap: 4 },
  word: { color: homeDesign.colors.text, fontSize: 25, fontWeight: "800" },
  phonetic: { color: homeDesign.colors.secondary, fontSize: 15 },
  phoneticUnavailable: { color: homeDesign.colors.secondary, fontSize: 13 },
  body: { gap: 8 },
  bodyScroll: { flexShrink: 1, maxHeight: 320 },
  partOfSpeech: { alignSelf: "flex-start", color: "#111111", backgroundColor: homeDesign.colors.tabActive, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: "700" },
  sectionLabel: { marginTop: 5, color: homeDesign.colors.secondary, fontSize: 13, fontWeight: "700" },
  translation: { color: homeDesign.colors.tabActive, fontSize: 18, lineHeight: 25, fontWeight: "800" },
  definition: { color: homeDesign.colors.text, fontSize: 15, lineHeight: 22 },
  example: { color: homeDesign.colors.text, fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  source: { marginTop: 4, color: homeDesign.colors.secondary, fontSize: 11 },
  loading: { minHeight: 85, alignItems: "center", justifyContent: "center", gap: 10 },
  secondary: { color: homeDesign.colors.secondary, fontSize: 14 },
  errorBlock: { alignItems: "center", gap: 12, paddingVertical: 12 },
  error: { color: "#ff9d9d", fontSize: 14, textAlign: "center" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: homeDesign.colors.surfaceRaised },
  retryText: { color: homeDesign.colors.link, fontWeight: "700" },
  saveBlock: { gap: 8 },
  saveButton: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: homeDesign.colors.tabActive },
  savedButton: { backgroundColor: homeDesign.colors.completed },
  saveButtonText: { color: "#111111", fontSize: 15, fontWeight: "800" },
  closeButton: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: homeDesign.colors.link },
  closeButtonText: { color: "#111111", fontSize: 16, fontWeight: "800" },
});
