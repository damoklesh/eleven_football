export function countWords(markdownBody: string) {
  const plainText = markdownBody
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`#>*_~|]/g, ' ')
    .trim();
  return plainText ? plainText.split(/\s+/u).length : 0;
}

export function readingTimeFromWordCount(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / 220));
}

export function isReasonableWordCount(expected: number, actual: number) {
  return Math.abs(expected - actual) <= Math.max(25, Math.ceil(expected * 0.15));
}
