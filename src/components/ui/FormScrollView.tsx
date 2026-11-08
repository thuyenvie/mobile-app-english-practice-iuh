import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
  type ScrollViewProps,
} from "react-native";

const FormFocusContext = createContext<(() => void) | undefined>(undefined);

/** Notify the enclosing form without changing the input value or submit policy. */
export function useFormInputFocus() {
  return useContext(FormFocusContext);
}

/** Measure the actual top, including safe area and any session banner above us. */
export function KeyboardViewport({ children }: PropsWithChildren) {
  const container = useRef<View>(null);
  const [top, setTop] = useState(0);
  return (
    <View ref={container} collapsable={false} style={styles.flex}
      onLayout={() => container.current?.measureInWindow((_x, y) => setTop(y))}>
      <KeyboardAvoidingView style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={top}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Safe area belongs to the screen; the form owns only keyboard avoidance. */
export function FormScrollView({ children, onLayout, ...props }: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const reveal = () => {
    if (Platform.OS !== "web") {
      const input = TextInput.State.currentlyFocusedInput();
      if (input) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(input, 24, true);
    }
  };
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", reveal);
    return () => subscription.remove();
  }, []);
  return (
    <KeyboardViewport>
      <FormFocusContext.Provider value={reveal}>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onLayout={event => { onLayout?.(event); reveal(); }}
          {...props}
        >
          {children}
        </ScrollView>
      </FormFocusContext.Provider>
    </KeyboardViewport>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
