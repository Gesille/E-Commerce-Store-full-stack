export function heatColor(val: number) {
  if (val < 15) return { bg: "rgba(59,130,246,0.07)", text: "#94a3b8" };
  if (val < 30) return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" };
  if (val < 50) return { bg: "rgba(59,130,246,0.30)", text: "#3b82f6" };
  if (val < 70) return { bg: "rgba(59,130,246,0.55)", text: "#fff" };
  return { bg: "rgba(59,130,246,0.85)", text: "#fff" };
}