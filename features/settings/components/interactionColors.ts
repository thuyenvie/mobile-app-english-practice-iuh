/** Soft green feedback on top of the current theme; disabled controls stay neutral. */
const light = Object.freeze({
  selectedBackground: "rgba(98, 155, 20, 0.14)",
  pressedBackground: "rgba(98, 155, 20, 0.23)",
  disabledBackground: "#eef0f2",
  disabledBorder: "#c8cdd3",
  disabledText: "#586270",
});
const dark = Object.freeze({
  selectedBackground: "rgba(183, 242, 59, 0.16)",
  pressedBackground: "rgba(183, 242, 59, 0.25)",
  disabledBackground: "#22272e",
  disabledBorder: "#424a55",
  disabledText: "#a6afbb",
});

export function getInteractionColors(theme: { background?: string; surface?: string }) {
  const hex = (theme.background ?? theme.surface ?? "#10151d").replace("#", "");
  const rgb = hex.length === 3 ? [...hex].map(value => value + value).join("") : hex;
  const brightness = [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) =>
    sum + weight * parseInt(rgb.slice(index * 2, index * 2 + 2), 16), 0);
  return brightness > 128 ? light : dark;
}
