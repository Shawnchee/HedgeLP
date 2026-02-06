/**
 * Telegram MarkdownV2 message formatting helpers.
 *
 * All public functions return strings safe for `parse_mode: "MarkdownV2"`.
 */

// Characters that must be escaped in MarkdownV2 text (outside code blocks)
const MD2_ESCAPE_REGEX = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

/** Escape a string for Telegram MarkdownV2 */
export function esc(text: string): string {
  return text.replace(MD2_ESCAPE_REGEX, "\\$1");
}

/** Bold text */
export function bold(text: string): string {
  return `*${esc(text)}*`;
}

/** Italic text */
export function italic(text: string): string {
  return `_${esc(text)}_`;
}

/** Inline code (no escaping needed inside backticks) */
export function code(text: string): string {
  return `\`${text}\``;
}

/** Code block */
export function codeBlock(text: string, lang = ""): string {
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

/** Format a number with commas and fixed decimals */
export function fmtNum(
  value: number | undefined | null,
  decimals = 2
): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a USD price (auto-detect decimals for small values) */
export function fmtUsd(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "$N/A";
  const decimals = Math.abs(value) < 0.01 ? 6 : Math.abs(value) < 1 ? 4 : 2;
  return `$${fmtNum(value, decimals)}`;
}

/** Format a percentage */
export function fmtPct(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${fmtNum(value, 2)}%`;
}

/** Arrow indicator for price change */
export function changeArrow(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return value >= 0 ? "📈" : "📉";
}

/** Format large numbers compactly (1.2M, 340K, etc.) */
export function fmtCompact(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return fmtNum(value, 2);
}

/** Build a divider line */
export function divider(): string {
  return esc("─".repeat(24));
}

/** Truncate text to a max length */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
