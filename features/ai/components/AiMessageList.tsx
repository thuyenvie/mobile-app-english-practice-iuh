import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useEffect, useRef, type ReactNode } from "react";

import { FlatList, Image } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';

import type {
  LanguageAnalysis,
  QuestionImageExplanationResponse,
  TutorMessage,
} from '../types';

export function AiMessageList({
  messages,
  loading,
  loadingHistory,
  hasOlderMessages,
  onSuggestion,
  onLoadOlder,
  suggestionContent,
}: {
  messages: TutorMessage[];
  loading: boolean;
  loadingHistory: boolean;
  hasOlderMessages: boolean;
  onSuggestion: (prompt: string) => void;
  onLoadOlder: () => void;
  suggestionContent?: ReactNode;
}) {
  const { aiDesign } = useThemedStyles();
  const listRef = useRef<FlatList<TutorMessage>>(null);
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [lastMessageId, loading]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <AiMessageBubble message={item} onSuggestion={onSuggestion} />
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 14 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        hasOlderMessages ? (
          <AppButton
            appearance="text"
            height={38}
            disabled={loadingHistory}
            aria-label="Tải tin nhắn cũ hơn"
            onPress={onLoadOlder}
          >
            <Text color={aiDesign.colors.accent} fontSize={12}>
              {loadingHistory ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}
            </Text>
          </AppButton>
        ) : null
      }
      ListFooterComponent={<>{suggestionContent}{loading ? <TypingBubble /> : null}</>}
    />
  );
}

function AiMessageBubble({
  message,
  onSuggestion,
}: {
  message: TutorMessage;
  onSuggestion: (prompt: string) => void;
}) {
  const { aiDesign, homeDesign } = useThemedStyles();
  const user = message.role === 'user';

  return (
    <YStack alignItems={user ? 'flex-end' : 'flex-start'} gap={8}>
      <XStack maxWidth="88%" alignItems="flex-start" gap={8}>
        {!user ? <TutorAvatar /> : null}
        <YStack
          flexShrink={1}
          gap={10}
          padding={12}
          borderRadius={16}
          backgroundColor={user ? aiDesign.colors.send : aiDesign.colors.surface}
        >
          {message.kind === 'image' && message.imageUri ? (
            <Image
              source={{ uri: message.imageUri }}
              resizeMode="cover"
              style={{ width: 210, maxWidth: "100%", aspectRatio: 21 / 16, borderRadius: 10 }}
            />
          ) : null}
          {message.kind === 'image' && !message.imageUri ? (
            <XStack alignItems="center" gap={7}>
              <MaterialCommunityIcons name="image-off-outline" size={22} color={user ? homeDesign.colors.onAccent : aiDesign.colors.text} />
              <Text color={user ? homeDesign.colors.onAccent : aiDesign.colors.secondary} fontSize={14} flexShrink={1}>
                Ảnh không còn trên thiết bị này.
              </Text>
            </XStack>
          ) : null}
          <Text color={user ? homeDesign.colors.onAccent : aiDesign.colors.text} fontSize={15} lineHeight={21}>
            {message.text}
          </Text>
          {message.kind === 'chat' ? (
            <LanguageFeedbackCard analysis={message.analysis} />
          ) : null}
          {message.kind === 'imageExplanation' ? (
            <QuestionExplanationCard explanation={message.explanation} />
          ) : null}
        </YStack>
      </XStack>

      {message.kind === 'chat' && message.suggestions.length ? (
        <XStack flexWrap="wrap" gap={7} paddingLeft={44}>
          {message.suggestions.slice(0, 3).map((suggestion) => (
            <AppButton
              key={suggestion}
              appearance="text"
              height="auto"
              minHeight={36}
              maxWidth="100%"
              paddingHorizontal={10}
              paddingVertical={7}
              borderWidth={1}
              borderColor={aiDesign.colors.accent}
              borderRadius={18}
              aria-label={suggestion}
              onPress={() => onSuggestion(suggestion)}
            >
              <Text color={aiDesign.colors.accent} fontSize={12} flexShrink={1}>
                {suggestion}
              </Text>
            </AppButton>
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}

function TutorAvatar() {
  const { aiDesign } = useThemedStyles();
  return (
    <YStack
      width={36}
      height={36}
      flexShrink={0}
      borderRadius={18}
      borderWidth={1}
      borderColor={aiDesign.colors.accent}
      backgroundColor={aiDesign.colors.avatar}
      alignItems="center"
      justifyContent="center"
    >
      <MaterialCommunityIcons name="robot" size={23} color={aiDesign.colors.robot} />
    </YStack>
  );
}

function TypingBubble() {
  const { aiDesign } = useThemedStyles();
  return (
    <XStack alignItems="center" gap={8} marginTop={14}>
      <TutorAvatar />
      <Text
        paddingHorizontal={13}
        paddingVertical={10}
        borderRadius={14}
        color={aiDesign.colors.secondary}
        backgroundColor={aiDesign.colors.surface}
      >
        Gia sư đang suy nghĩ...
      </Text>
    </XStack>
  );
}

function LanguageFeedbackCard({ analysis }: { analysis: LanguageAnalysis }) {
  const { aiDesign, homeDesign } = useThemedStyles();
  const grammarIssues = analysis.grammarIssues || [];
  const vocabulary = analysis.vocabulary || [];
  const corrected =
    analysis.correctedMessage?.trim() &&
    analysis.correctedMessage.trim() !== analysis.originalMessage?.trim();

  if (!corrected && !grammarIssues.length && !vocabulary.length) return null;

  return (
    <YStack gap={9} padding={10} borderRadius={10} backgroundColor={homeDesign.colors.surfaceRaised}>
      {corrected ? (
        <Section title="Câu sửa">
          <Text color={aiDesign.colors.text} fontSize={13} lineHeight={19}>
            {analysis.correctedMessage}
          </Text>
        </Section>
      ) : null}

      {grammarIssues.length ? (
        <Section title="Ngữ pháp">
          {grammarIssues.map((issue, index) => (
            <YStack key={`${issue.grammarRule}-${index}`} gap={2}>
              <Text color={aiDesign.colors.text} fontSize={13} fontWeight="700">
                {issue.original} → {issue.correction}
              </Text>
              <Text color={aiDesign.colors.secondary} fontSize={12} lineHeight={18}>
                {issue.grammarRule}: {issue.explanation}
              </Text>
            </YStack>
          ))}
        </Section>
      ) : null}

      {vocabulary.length ? (
        <Section title="Từ vựng">
          {vocabulary.map((item, index) => (
            <Text
              key={`${item.wordOrPhrase}-${index}`}
              color={aiDesign.colors.text}
              fontSize={12}
              lineHeight={18}
            >
              • {item.wordOrPhrase} ({item.partOfSpeech}): {item.vietnameseMeaning}
              {item.example ? ` — ${item.example}` : ''}
            </Text>
          ))}
        </Section>
      ) : null}
    </YStack>
  );
}

function QuestionExplanationCard({
  explanation,
}: {
  explanation: QuestionImageExplanationResponse;
}) {
  const { aiDesign, themeColor } = useThemedStyles();
  return (
    <YStack gap={10}>
      <Section title="1. Đáp án đúng">
        <Text color={aiDesign.colors.text} fontSize={13} lineHeight={19}>
          {explanation.correctAnswer
            ? `${explanation.correctAnswer.label}. ${explanation.correctAnswer.text}`
            : 'Ảnh chưa đủ rõ để xác định đáp án.'}
        </Text>
      </Section>

      {explanation.translation ? (
        <Section title="2. Dịch nghĩa">
          <Text color={aiDesign.colors.text} fontSize={13} lineHeight={19}>
            {explanation.translation.completedSentence}
          </Text>
          <Text color={aiDesign.colors.secondary} fontSize={12} lineHeight={18}>
            {explanation.translation.vietnameseMeaning}
          </Text>
        </Section>
      ) : null}

      {explanation.grammarAnalysis ? (
        <Section title="3. Ngữ pháp">
          <Text color={aiDesign.colors.text} fontSize={13} fontWeight="700">
            {explanation.grammarAnalysis.grammarPoint}
          </Text>
          <Text color={aiDesign.colors.accent} fontSize={12}>
            {explanation.grammarAnalysis.structure}
          </Text>
          <Text color={aiDesign.colors.secondary} fontSize={12} lineHeight={18}>
            {explanation.grammarAnalysis.explanation}
          </Text>
        </Section>
      ) : null}

      {explanation.optionAnalysis.length ? (
        <Section title="4. Phân tích lựa chọn">
          {explanation.optionAnalysis.map((option) => (
            <Text key={option.label} color={aiDesign.colors.text} fontSize={12} lineHeight={18}>
              {option.correct ? '✓' : '•'} {option.label}. {option.text}: {option.reason}
            </Text>
          ))}
        </Section>
      ) : null}

      {explanation.vocabulary.length ? (
        <Section title="5. Từ vựng">
          {explanation.vocabulary.map((item, index) => (
            <Text key={`${item.word}-${index}`} color={aiDesign.colors.text} fontSize={12} lineHeight={18}>
              • {item.word} ({item.partOfSpeech}): {item.meaning}
            </Text>
          ))}
        </Section>
      ) : null}

      <Text color={aiDesign.colors.secondary} fontSize={11}>
        Độ tin cậy: {Math.round(explanation.confidence * 100)}%
      </Text>
      {explanation.warnings.map((warning, index) => (
        <Text key={`${warning}-${index}`} color={themeColor("#ffb36b", "text")} fontSize={11} lineHeight={16}>
          Lưu ý: {warning}
        </Text>
      ))}
    </YStack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { aiDesign } = useThemedStyles();
  return (
    <YStack gap={4}>
      <Text color={aiDesign.colors.accent} fontSize={13} fontWeight="800">
        {title}
      </Text>
      {children}
    </YStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { aiDesign, homeDesign, themeColor } = appTheme;

    return { aiDesign, homeDesign, themeColor };
  }, [appTheme]);
}
