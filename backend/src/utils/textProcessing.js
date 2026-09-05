/**
 * Tokenize and compute word frequency map for a text.
 * Lowercases, strips punctuation, removes short words.
 */
function wordFrequency(text) {
  if (!text) return {};
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  return freq;
}

module.exports = {
  wordFrequency
};
