/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.match(urlPattern) || [];
}
