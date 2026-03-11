export function shortenAddress(addr: string): string {
  if (!addr) return addr;
  let s = addr;
  s = s.replace(/Россия,?\s*/gi, "");
  s = s.replace(/Забайкальский край,?\s*/gi, "");
  s = s.replace(/Забайкальский\s+край,?\s*/gi, "");
  s = s.replace(/городской округ[^,]*,?\s*/gi, "");
  s = s.replace(/город\s+/gi, "");
  s = s.replace(/,\s*,/g, ",");
  s = s.replace(/^[\s,]+/, "").replace(/[\s,]+$/, "");
  return s;
}
