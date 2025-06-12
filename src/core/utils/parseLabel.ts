// parseLabel.ts
export function parseLabel(label: any): Record<string, string> {
  // Map ise, plain objeye çevir
  if (label instanceof Map) {
    return Object.fromEntries(label);
  }
  if (typeof label === "object" && label !== null) {
    return { ...label };
  }
  if (typeof label === "string") {
    try {
      return JSON.parse(label);
    } catch {
      return { tr: label };
    }
  }
  return {};
}
