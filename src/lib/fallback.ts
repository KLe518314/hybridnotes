// Demo-mode fallbacks — pure local text statistics, no model, no network.
// These keep HybridNotes fully demonstrable before a Firebase project is
// configured, and double as the last-resort path if both AI routes fail.

const STOPWORDS = new Set(
  (
    'the a an and or but if then else of at by for with about into through after over ' +
    'between out against during without before under around among is are was were be ' +
    'been being have has had do does did will would shall should can could may might ' +
    'must i you he she it we they them his her its our their this that these those as ' +
    'from to in on not no yes so such than too very just also more most other some any'
  ).split(' '),
);

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?。！？]+[.!?。！？]+/g) ?? [text])
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function wordFreq(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  return freq;
}

/**
 * Extractive summary: score sentences by the frequency of the words they
 * contain, keep the top ones in original order.
 */
export function extractiveSummary(text: string, maxSentences = 3): string {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(' ') || text.trim();
  const freq = wordFreq(text);
  const scored = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? [];
    const score =
      words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0) / Math.max(words.length, 1);
    return { sentence, index, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
    .join(' ');
}

/** Statistical keyword extraction: most frequent meaningful words. */
export function extractKeywordsLocal(text: string, max = 8): string[] {
  return [...wordFreq(text).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word);
}
