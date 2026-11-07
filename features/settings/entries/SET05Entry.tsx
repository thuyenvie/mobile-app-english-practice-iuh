import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/lib/auth/useSession";
import { SettingsRow } from "../components/SettingsRow";
import { SettingsTextField, settingsFormStyles } from "../components/SettingsTextField";
import { getAccountSettingsError, updateAccountPassword } from "../api/accountSettingsApi";
import type { SettingsEntryProps } from "../types";

export function SET05Entry({ theme, authenticated }: SettingsEntryProps) {
  const session = useSession();
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const clear = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  useEffect(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(false);
    setError("");
    if (session.status !== "authenticated" || !authenticated) setExpanded(false);
  }, [authenticated, session.generation, session.status]);

  const save = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ các trường mật khẩu.");
      setSaved(false);
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError("Mật khẩu mới cần có từ 8 đến 72 ký tự.");
      setSaved(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận không khớp.");
      setSaved(false);
      return;
    }
    if (session.status !== "authenticated") {
      setError("Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateAccountPassword({ currentPassword, newPassword }, session.generation);
      clear();
      setSaved(true);
    } catch (requestError) {
      setError(getAccountSettingsError(requestError, "Không thể đổi mật khẩu."));
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || session.status !== "authenticated";
  return (
    <View style={{ gap: 10 }}>
      <SettingsRow
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu đăng nhập của bạn."
        theme={theme}
        unavailable={false}
        expanded={expanded}
        onPress={() => { if (expanded) clear(); setExpanded(!expanded); setError(""); setSaved(false); }}
      />
      {expanded ? (
        <View style={[settingsFormStyles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[settingsFormStyles.hint, { color: theme.muted }]}>Nhập mật khẩu hiện tại để xác nhận thay đổi. Mật khẩu mới có từ 8 đến 72 ký tự.</Text>
          {!authenticated ? <Text style={{ color: theme.error }}>Hãy đăng nhập lại để đổi mật khẩu.</Text> : null}
          <SettingsTextField label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} theme={theme} secureTextEntry autoComplete="current-password" disabled={disabled} />
          <SettingsTextField label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} theme={theme} secureTextEntry autoComplete="new-password" maxLength={72} disabled={disabled} />
          <SettingsTextField label="Xác nhận mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} theme={theme} secureTextEntry autoComplete="new-password" maxLength={72} disabled={disabled} />
          {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
          {saved ? <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>Đã đổi mật khẩu thành công.</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => void save()}
            style={[settingsFormStyles.button, { backgroundColor: theme.selection, opacity: disabled ? 0.55 : 1 }]}>
            <Text style={[settingsFormStyles.buttonText, { color: theme.background }]}>{saving ? "Đang cập nhật…" : "Đổi mật khẩu"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
