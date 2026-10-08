export function parseJson<T>(raw: unknown, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw as T;
  
  try {
    const jsonStr = String(raw).trim();
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const sanitized = jsonStr.substring(firstOpen, lastClose + 1);
      return JSON.parse(sanitized) as T;
    }
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}
