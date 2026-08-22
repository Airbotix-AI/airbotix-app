export function decodeLegacyJtwText(hexCodePoints: string): string {
  return hexCodePoints
    .split('-')
    .map((codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .join('');
}
