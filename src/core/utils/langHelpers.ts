// src/core/utils/langHelpers.ts

export function getMessage(
  locale: string | undefined,
  deMsg: string,
  trMsg: string,
  enMsg: string
): string {
  if (!locale) return enMsg;
  switch (locale) {
    case "de":
      return deMsg;
    case "tr":
      return trMsg;
    default:
      return enMsg;
  }
}
