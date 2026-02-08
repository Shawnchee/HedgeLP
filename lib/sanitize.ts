/**
 * Sanitize a string for safe inclusion in Telegram MarkdownV2 messages.
 * Escapes all reserved characters that could break Markdown parsing or
 * be used for injection.
 */
export function sanitizeTelegramMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Validate and sanitize a comma-separated list of CoinGecko token IDs.
 * Only allows lowercase alphanumeric characters and hyphens.
 * Returns an empty string if no valid IDs are found.
 *
 * @param ids - Raw query param value (e.g. "bitcoin,ethereum,solana")
 * @param maxIds - Maximum number of IDs to allow (default 20)
 */
export function sanitizeTokenIds(ids: string, maxIds = 20): string {
  if (!ids || typeof ids !== "string") return "";
  return ids
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[a-z0-9-]+$/.test(id) && id.length <= 64)
    .slice(0, maxIds)
    .join(",");
}

/**
 * Validate a CoinGecko `days` parameter.
 * Clamps to known-good values to prevent query string injection.
 */
export function sanitizeChartDays(days: string): string {
  const ALLOWED_DAYS = ["1", "7", "14", "30", "90", "365", "max"];
  const parsed = days?.trim().toLowerCase();
  return ALLOWED_DAYS.includes(parsed) ? parsed : "7";
}

/**
 * Validate a CoinGecko coin ID (single, not comma-separated).
 */
export function sanitizeCoinId(id: string): string {
  if (!id || typeof id !== "string") return "ethereum";
  const cleaned = id.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(cleaned) && cleaned.length <= 64
    ? cleaned
    : "ethereum";
}
