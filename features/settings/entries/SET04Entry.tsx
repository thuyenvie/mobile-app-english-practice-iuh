import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSession } from "@/lib/auth/useSession";
import { SettingsRow } from "../components/SettingsRow";
import { SettingsTextField, settingsFormStyles } from "../components/SettingsTextField";
import {
  getAccountProfile,
  getAccountSettingsError,
  updateAccountProfile,
} from "../api/accountSettingsApi";
import type { SettingsEntryProps } from "../types";

export function SET04Entry({ theme, authenticated }: SettingsEntryProps) {
  const session = useSession();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lastNameInput = useRef<TextInput>(null);
  const dobInput = useRef<TextInput>(null);

  useEffect(() => {
    if (session.status === "authenticated" && authenticated) return;
    setExpanded(false);
    setFirstName("");
    setLastName("");
    setDob("");
    setSaved(false);
  }, [authenticated, session.generation, session.status]);

  useEffect(() => {
    if (!expanded || !authenticated || session.status !== "authenticated") return;
    let active = true;
    setLoading(true);
    setError("");
    void getAccountProfile(session.generation)
      .then(profile => {
        if (!active) return;
        setFirstName(profile.firstName ?? "");
        setLastName(profile.lastName ?? "");
        setDob(profile.dob ?? "");
      })
      .catch(requestError => {
        if (active) setError(getAccountSettingsError(requestError, "Không thể tải thông tin cá nhân."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authenticated, expanded, session.generation, session.status]);

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) return "Vui lòng nhập họ và tên.";
    if (firstName.trim().length > 100 || lastName.trim().length > 100) return "Họ và tên không được dài quá 100 ký tự.";
    const date = dob.trim();
    if (!date) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Ngày sinh cần có định dạng YYYY-MM-DD.";
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      return "Ngày sinh không hợp lệ.";
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (date > today) return "Ngày sinh không thể ở tương lai.";
    return "";
  };

  const save = async () => {
    const validation = validate();
    if (validation) { setError(validation); setSaved(false); return; }
    if (session.status !== "authenticated") { setError("Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại."); return; }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const profile = await updateAccountProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob.trim() || null,
      }, session.generation);
      setFirstName(profile.firstName ?? firstName.trim());
      setLastName(profile.lastName ?? lastName.trim());
      setDob(profile.dob ?? "");
      setSaved(true);
    } catch (requestError) {
      setError(getAccountSettingsError(requestError, "Không thể cập nhật thông tin cá nhân."));
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving || session.status !== "authenticated";
  return (
    <View style={{ gap: 10 }}>
      <SettingsRow
        title="Thông tin cá nhân"
        description="Cập nhật họ tên và ngày sinh của bạn."
        theme={theme}
        unavailable={false}
        expanded={expanded}
        onPress={() => { setExpanded(value => !value); setError(""); setSaved(false); }}
      />
      {expanded ? (
        <View style={[settingsFormStyles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[settingsFormStyles.hint, { color: theme.muted }]}>Thông tin này được lưu vào hồ sơ tài khoản của bạn.</Text>
          {loading ? <Text style={{ color: theme.muted }}>Đang tải hồ sơ…</Text> : null}
          <SettingsTextField label="Tên" value={firstName} onChangeText={value => { setFirstName(value); setSaved(false); }} theme={theme} autoComplete="given-name" maxLength={100} disabled={disabled} returnKeyType="next" onSubmitEditing={() => lastNameInput.current?.focus()} />
          <SettingsTextField inputRef={lastNameInput} label="Họ" value={lastName} onChangeText={value => { setLastName(value); setSaved(false); }} theme={theme} autoComplete="family-name" maxLength={100} disabled={disabled} returnKeyType="next" onSubmitEditing={() => dobInput.current?.focus()} />
          <SettingsTextField inputRef={dobInput} label="Ngày sinh (YYYY-MM-DD)" value={dob} onChangeText={value => { setDob(value); setSaved(false); }} theme={theme} autoComplete="birthdate-full" placeholder="Ví dụ: 2000-01-31" hint="Không bắt buộc · Năm-Tháng-Ngày" maxLength={10} disabled={disabled} />
          {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
          {saved ? <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>Đã cập nhật thông tin cá nhân.</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => void save()}
            style={[settingsFormStyles.button, { backgroundColor: theme.selection, opacity: disabled ? 0.55 : 1 }]}>
            <Text style={[settingsFormStyles.buttonText, { color: theme.background }]}>{saving ? "Đang lưu…" : "Lưu thông tin"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
