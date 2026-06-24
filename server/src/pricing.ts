// Per-model credit multiplier for your own billing. Adjust freely.
const priceTable: Array<{ match: string; credits: number }> = [
  { match: "o1", credits: 12 },
  { match: "o3", credits: 12 },
  { match: "gpt-4.1", credits: 6 },
  { match: "gpt-4o", credits: 5 },
  { match: "claude-3-7", credits: 8 },
  { match: "claude-3-5-sonnet", credits: 6 },
  { match: "claude", credits: 5 },
  { match: "gemini-2", credits: 5 },
  { match: "gemini-1.5-pro", credits: 5 },
  { match: "gemini", credits: 3 },
  { match: "deepseek", credits: 1 },
  { match: "qwen", credits: 1 },
  { match: "mini", credits: 1 },
  { match: "haiku", credits: 1 },
];

export function creditsForModel(model?: string): number {
  const normalized = (model ?? "").toLowerCase();
  const hit = priceTable.find((entry) => normalized.includes(entry.match));
  return hit ? hit.credits : 2;
}

export function getPriceTable() {
  return priceTable;
}
