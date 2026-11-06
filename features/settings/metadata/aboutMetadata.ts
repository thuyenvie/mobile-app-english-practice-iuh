/** Only public display fields are read; never expose config.extra or environment values. */
export function getAboutMetadata(config: unknown) {
  const value = config && typeof config === "object" ? config as Record<string, unknown> : {};
  const displayText = (field: unknown) => typeof field === "string" && field.trim() &&
    field.length <= 160 && !/[\u0000-\u001f\u007f]/.test(field) ? field.trim() : null;
  return {
    name: displayText(value.name) ?? "Tên ứng dụng chưa khả dụng",
    version: displayText(value.version) ?? "Chưa có thông tin phiên bản",
  };
}
