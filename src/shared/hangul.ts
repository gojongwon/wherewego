/** 마지막 글자에 받침이 있으면 true. 한글이 아니면 false. */
export function hasBatchim(word: string): boolean {
  const ch = word.at(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** `이/가`처럼 받침 있으면 앞, 없으면 뒤를 붙인다. */
export function josa(word: string, pair: `${string}/${string}`): string {
  const sep = pair.indexOf('/');
  const a = pair.slice(0, sep);
  const b = pair.slice(sep + 1);
  return word + (hasBatchim(word) ? a : b);
}
