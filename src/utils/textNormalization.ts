
/**
 * Normalizes text by removing accents and converting to lowercase
 * Used for comparing user input with database values that may not have accents
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Converts text to URL-friendly format (lowercase, no spaces, no accents)
 */
export function textToSlug(text: string): string {
  return normalizeText(text).replace(/\s+/g, '-');
}
