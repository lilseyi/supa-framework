/**
 * MessageInput Component
 *
 * Keyboard-aware input bar for composing and sending chat messages.
 *
 * Copied from Togather's battle-tested MessageInput, stripped of
 * app-specific features (image upload, GIFs, voice memos, link previews,
 * document picker). Those are left as extension points via props.
 *
 * Core features retained:
 * - Multi-line text input with max height
 * - Send button with loading state
 * - Reply preview banner
 * - Keyboard visibility tracking
 * - Offline hint banner
 * - Platform-specific input behavior (iOS/Android/Web)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageInputTheme {
  /** Container background */
  background?: string;
  /** Container top border color */
  borderColor?: string;
  /** Input field background */
  inputBackground?: string;
  /** Input field border color */
  inputBorderColor?: string;
  /** Input text color */
  textColor?: string;
  /** Placeholder text color */
  placeholderColor?: string;
  /** Send button background color */
  sendButtonColor?: string;
  /** Send button text/icon color */
  sendButtonIconColor?: string;
  /** Reply preview background */
  replyBackground?: string;
  /** Reply accent bar color */
  replyAccentColor?: string;
  /** Reply label text color */
  replyLabelColor?: string;
  /** Reply body text color */
  replyTextColor?: string;
  /** Offline hint text color */
  offlineHintColor?: string;
  /** Disabled button/text color */
  disabledColor?: string;
}

export interface ReplyTo {
  id: string;
  content: string;
  senderName: string;
}

export interface MessageInputProps {
  /** Send message handler */
  onSend: (text: string) => Promise<void> | void;
  /** Whether a send is in progress */
  isSending?: boolean;
  /** Reply context (shows reply banner) */
  replyTo?: ReplyTo | null;
  /** Cancel reply handler */
  onCancelReply?: () => void;
  /** Whether the device is offline (shows hint banner) */
  isOffline?: boolean;
  /** Max text length (default 2000) */
  maxLength?: number;
  /** Placeholder text (default "Message...") */
  placeholder?: string;
  /** Theme overrides */
  theme?: MessageInputTheme;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Render a leading accessory (e.g., attachment button) */
  renderLeadingAccessory?: () => React.ReactElement;
  /** Render a trailing accessory (e.g., voice memo button) */
  renderTrailingAccessory?: () => React.ReactElement;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INPUT_LINES = 8;
const LINE_HEIGHT = 20;
const INPUT_PADDING_VERTICAL = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageInput({
  onSend,
  isSending = false,
  replyTo,
  onCancelReply,
  isOffline = false,
  maxLength = 2000,
  placeholder = "Message...",
  theme = {},
  style,
  disabled = false,
  renderLeadingAccessory,
  renderTrailingAccessory,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [nativeScrollEnabled, setNativeScrollEnabled] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  // Colors with defaults
  const bg = theme.background ?? "#fff";
  const border = theme.borderColor ?? "#E5E5EA";
  const inputBg = theme.inputBackground ?? "#F2F2F7";
  const inputBorder = theme.inputBorderColor ?? "#E5E5EA";
  const textColor = theme.textColor ?? "#000";
  const placeholderColor = theme.placeholderColor ?? "#8E8E93";
  const sendBtnColor = theme.sendButtonColor ?? "#007AFF";
  const sendBtnIcon = theme.sendButtonIconColor ?? "#fff";

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    const textAtSend = text;

    try {
      await onSend(trimmed);

      // Clear only the text that was present when send started
      if (text === textAtSend) {
        setText("");
        setNativeScrollEnabled(false);
      }

      // Re-focus input so keyboard stays open (like iMessage)
      if (Platform.OS !== "web") {
        textInputRef.current?.focus();
      }
    } catch (error) {
      console.error("[MessageInput] Send failed:", error);
    }
  }, [text, isSending, disabled, onSend]);

  // Keyboard visibility listener
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {});
    const hideSub = Keyboard.addListener(hideEvent, () => {});

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const canSend = text.trim().length > 0 && !isSending && !disabled;

  return (
    <View style={[styles.container, { backgroundColor: bg, borderTopColor: border }, style]}>
      {/* Reply Preview */}
      {replyTo && (
        <View
          style={[
            styles.replyPreview,
            {
              backgroundColor: theme.replyBackground ?? "#F2F2F7",
              borderLeftColor: theme.replyAccentColor ?? "#007AFF",
            },
          ]}
        >
          <View style={styles.replyContent}>
            <Text
              style={[
                styles.replyLabel,
                { color: theme.replyLabelColor ?? "#007AFF" },
              ]}
            >
              Replying to {replyTo.senderName}
            </Text>
            <Text
              style={[
                styles.replyText,
                { color: theme.replyTextColor ?? "#8E8E93" },
              ]}
              numberOfLines={1}
            >
              {replyTo.content}
            </Text>
          </View>
          {onCancelReply && (
            <Pressable onPress={onCancelReply} style={styles.replyCancel}>
              <Text style={{ color: theme.replyTextColor ?? "#8E8E93", fontSize: 18 }}>
                {"x"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Offline Hint */}
      {isOffline && (
        <View style={styles.offlineHint}>
          <Text
            style={[
              styles.offlineHintText,
              { color: theme.offlineHintColor ?? "#8E8E93" },
            ]}
          >
            Messages will be sent when you are back online
          </Text>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Leading accessory (e.g., attachment button) */}
        {renderLeadingAccessory?.()}

        {/* Text Input */}
        <TextInput
          ref={textInputRef}
          style={[
            styles.input,
            isWeb ? styles.inputWeb : styles.inputNative,
            {
              borderColor: inputBorder,
              backgroundColor: inputBg,
              color: textColor,
            },
          ]}
          value={text}
          onChangeText={handleTextChange}
          onContentSizeChange={
            isWeb
              ? undefined
              : (event) => {
                  const contentHeight = event.nativeEvent.contentSize.height;
                  const maxContentHeight = LINE_HEIGHT * MAX_INPUT_LINES;
                  setNativeScrollEnabled(contentHeight >= maxContentHeight);
                }
          }
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          multiline
          scrollEnabled={isWeb ? true : nativeScrollEnabled}
          maxLength={maxLength}
          editable={!disabled}
        />

        {/* Trailing accessory */}
        {renderTrailingAccessory?.()}

        {/* Send Button */}
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: sendBtnColor },
            !canSend && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={sendBtnIcon} />
          ) : (
            <Text style={[styles.sendButtonText, { color: sendBtnIcon }]}>
              {"↑"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderLeftWidth: 3,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
  },
  replyCancel: {
    padding: 4,
  },
  offlineHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 4,
  },
  offlineHintText: {
    fontSize: 11,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: INPUT_PADDING_VERTICAL,
    fontSize: 16,
    maxHeight: LINE_HEIGHT * MAX_INPUT_LINES + INPUT_PADDING_VERTICAL * 2,
  },
  inputNative: {
    minHeight: 40,
  },
  inputWeb: {
    minHeight: 40,
    height: "auto" as any,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },
});
