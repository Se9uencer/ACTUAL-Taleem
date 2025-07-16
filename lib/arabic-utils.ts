/**
 * Utility functions for Arabic text processing
 */

import type { Surah } from "@/types";
import { arabicConfig } from "./config";

/**
 * Removes Arabic diacritics (tashkeel/harakat) from text
 * Includes all major Arabic diacritics for proper matching between 
 * transcription (no harakat) and Quranic text (with harakat)
 */
export function removeDiacritics(text: string): string {
  // Comprehensive Unicode range for Arabic diacritics (harakat)
  // U+064B to U+065F: Arabic diacritical marks (fatha, kasra, damma, etc.)
  // U+0670: Arabic letter superscript alif  
  // U+06D6 to U+06ED: Additional Arabic marks
  // U+08D4 to U+08E1: Arabic small high marks
  // U+08E3 to U+08FF: Extended Arabic marks
  return text
    .replace(/[\u064B-\u065F]/g, "") // Main diacritics range
    .replace(/[\u0670]/g, "")        // Superscript alif
    .replace(/[\u06D6-\u06ED]/g, "") // Additional Arabic marks
    .replace(/[\u08D4-\u08E1]/g, "") // Arabic small high marks
    .replace(/[\u08E3-\u08FF]/g, "") // Extended Arabic marks
}

/**
 * Normalizes different forms of Alif
 * Includes alif al-wasl (ٱ) which appears in Quranic text but sounds like regular alif
 */
export function normalizeAlif(text: string): string {
  return text.replace(/[أإآٱ]/g, "ا");
}

/**
 * Removes punctuation from Arabic text
 */
export function removePunctuation(text: string): string {
  return text.replace(/[،؛؟.:!،؛؟]/g, "");
}

/**
 * Normalizes Arabic text for matching purposes
 * Removes diacritics (based on config), normalizes alif, and removes punctuation
 */
export function normalizeArabicText(text: string): string {
  let normalized = text;
  
  // Remove harakat unless explicitly configured to keep them
  if (!arabicConfig.USE_HARAKAT_MATCHING) {
    normalized = removeDiacritics(normalized);
  }
  
  return removePunctuation(normalizeAlif(normalized));
}

/**
 * Normalizes Arabic text for display purposes (preserves harakat)
 * Only normalizes alif and removes punctuation, keeps diacritics for readability
 */
export function normalizeArabicTextForDisplay(text: string): string {
  return removePunctuation(normalizeAlif(text));
}

/**
 * Calculates the similarity between two Arabic texts
 * Returns a value between 0 and 1, where 1 means identical
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const normalizedText1: string = normalizeArabicText(text1);
  const normalizedText2: string = normalizeArabicText(text2);
  const distance: number = levenshteinDistance(normalizedText1, normalizedText2);
  const maxLength: number = Math.max(normalizedText1.length, normalizedText2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Calculates the Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m: number = str1.length;
  const n: number = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost: number = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}
