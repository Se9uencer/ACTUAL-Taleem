import { describe, it, expect } from "vitest"
import {
  removeDiacritics,
  normalizeAlif,
  removePunctuation,
  normalizeArabicText,
  normalizeArabicTextForDisplay,
  calculateSimilarity,
  levenshteinDistance,
} from "../arabic-utils"

// ---------------------------------------------------------------------------
// removeDiacritics
// ---------------------------------------------------------------------------
describe("removeDiacritics", () => {
  it("removes fatha (U+064E)", () => {
    expect(removeDiacritics("\u0628\u064E")).toBe("\u0628") // بَ → ب
  })

  it("removes kasra (U+0650)", () => {
    expect(removeDiacritics("\u0628\u0650")).toBe("\u0628") // بِ → ب
  })

  it("removes damma (U+064F)", () => {
    expect(removeDiacritics("\u0628\u064F")).toBe("\u0628") // بُ → ب
  })

  it("removes shadda (U+0651)", () => {
    expect(removeDiacritics("\u0644\u0651")).toBe("\u0644") // لّ → ل
  })

  it("removes sukun (U+0652)", () => {
    expect(removeDiacritics("\u0633\u0652")).toBe("\u0633") // سْ → س
  })

  it("removes tanwin fath (U+064B)", () => {
    expect(removeDiacritics("\u0643\u064B")).toBe("\u0643") // كً → ك
  })

  it("removes tanwin damm (U+064C)", () => {
    expect(removeDiacritics("\u0643\u064C")).toBe("\u0643") // كٌ → ك
  })

  it("removes tanwin kasr (U+064D)", () => {
    expect(removeDiacritics("\u0643\u064D")).toBe("\u0643") // كٍ → ك
  })

  it("removes superscript alif (U+0670)", () => {
    expect(removeDiacritics("\u0627\u0670")).toBe("\u0627") // اٰ → ا
  })

  it("removes additional Arabic marks in U+06D6–U+06ED range", () => {
    expect(removeDiacritics("\u0627\u06D6\u0628")).toBe("\u0627\u0628") // ا[mark]ب → اب
  })

  it("removes Arabic small high marks in U+08D4–U+08E1 range", () => {
    expect(removeDiacritics("\u0627\u08D4\u0628")).toBe("\u0627\u0628")
  })

  it("removes extended Arabic marks in U+08E3–U+08FF range", () => {
    expect(removeDiacritics("\u0627\u08E3\u0628")).toBe("\u0627\u0628")
  })

  it("removes multiple diacritics from a fully vowelled word", () => {
    // بِسْمِ → بسم
    expect(removeDiacritics("\u0628\u0650\u0633\u0652\u0645\u0650")).toBe("\u0628\u0633\u0645")
  })

  it("returns empty string unchanged", () => {
    expect(removeDiacritics("")).toBe("")
  })

  it("leaves Arabic text with no diacritics unchanged", () => {
    expect(removeDiacritics("\u0628\u0633\u0645 \u0627\u0644\u0644\u0647")).toBe(
      "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647"
    )
  })

  it("leaves non-Arabic text unchanged", () => {
    expect(removeDiacritics("hello world")).toBe("hello world")
  })

  it("leaves digits unchanged", () => {
    expect(removeDiacritics("123")).toBe("123")
  })
})

// ---------------------------------------------------------------------------
// normalizeAlif
// ---------------------------------------------------------------------------
describe("normalizeAlif", () => {
  it("normalizes \u0623 (alif with hamza above) to \u0627", () => {
    expect(normalizeAlif("\u0623")).toBe("\u0627")
  })

  it("normalizes \u0625 (alif with hamza below) to \u0627", () => {
    expect(normalizeAlif("\u0625")).toBe("\u0627")
  })

  it("normalizes \u0622 (alif with madda) to \u0627", () => {
    expect(normalizeAlif("\u0622")).toBe("\u0627")
  })

  it("normalizes \u0671 (alif al-wasl) to \u0627", () => {
    expect(normalizeAlif("\u0671")).toBe("\u0627")
  })

  it("leaves plain \u0627 (alif) unchanged", () => {
    expect(normalizeAlif("\u0627")).toBe("\u0627")
  })

  it("normalizes all four variants in a single string to plain alif", () => {
    const result = normalizeAlif("\u0623\u0625\u0622\u0671")
    expect(result).toBe("\u0627\u0627\u0627\u0627")
  })

  it("returns empty string unchanged", () => {
    expect(normalizeAlif("")).toBe("")
  })

  it("does not affect non-alif Arabic letters", () => {
    expect(normalizeAlif("\u0628\u0633\u0645")).toBe("\u0628\u0633\u0645") // بسم → بسم
  })

  it("handles mixed Arabic and Latin text", () => {
    expect(normalizeAlif("\u0623hello\u0625")).toBe("\u0627hello\u0627")
  })
})

// ---------------------------------------------------------------------------
// removePunctuation
// ---------------------------------------------------------------------------
describe("removePunctuation", () => {
  it("removes Arabic comma \u060C", () => {
    expect(removePunctuation("\u0643\u0644\u0645\u0629\u060C \u0643\u0644\u0645\u0629")).toBe(
      "\u0643\u0644\u0645\u0629 \u0643\u0644\u0645\u0629"
    )
  })

  it("removes Arabic semicolon \u061B", () => {
    expect(removePunctuation("a\u061Bb")).toBe("ab")
  })

  it("removes Arabic question mark \u061F", () => {
    expect(removePunctuation("a\u061F")).toBe("a")
  })

  it("removes ASCII period", () => {
    expect(removePunctuation("end.")).toBe("end")
  })

  it("removes ASCII colon", () => {
    expect(removePunctuation("title:")).toBe("title")
  })

  it("removes ASCII exclamation mark", () => {
    expect(removePunctuation("wow!")).toBe("wow")
  })

  it("removes multiple punctuation marks", () => {
    expect(removePunctuation("a\u060C b\u061F c!")).toBe("a b c")
  })

  it("returns empty string unchanged", () => {
    expect(removePunctuation("")).toBe("")
  })

  it("leaves text with no punctuation unchanged", () => {
    expect(removePunctuation("\u0628\u0633\u0645 \u0627\u0644\u0644\u0647")).toBe(
      "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647"
    )
  })
})

// ---------------------------------------------------------------------------
// normalizeArabicText
// ---------------------------------------------------------------------------
// Tests run with process.env.USE_HARAKAT_MATCHING unset (defaults to false),
// so normalizeArabicText removes diacritics in addition to normalizing alif
// and removing punctuation.
//
// The USE_HARAKAT_MATCHING=true code path (skip removeDiacritics) is
// equivalent to normalizeArabicTextForDisplay — those tests cover that branch.
describe("normalizeArabicText", () => {
  it("removes diacritics from vowelled text", () => {
    // بِسْمِ → بسم
    const input = "\u0628\u0650\u0633\u0652\u0645\u0650"
    expect(normalizeArabicText(input)).toBe("\u0628\u0633\u0645")
  })

  it("normalizes alif variants", () => {
    expect(normalizeArabicText("\u0623\u0625\u0622\u0671")).toBe("\u0627\u0627\u0627\u0627")
  })

  it("removes punctuation", () => {
    expect(normalizeArabicText("\u0628\u0633\u0645\u060C")).toBe("\u0628\u0633\u0645")
  })

  it("applies all three normalizations together", () => {
    // أَلَمْ، → الم (alif normalized, diacritics removed, punctuation removed)
    const input = "\u0623\u064E\u0644\u064E\u0645\u0652\u060C"
    expect(normalizeArabicText(input)).toBe("\u0627\u0644\u0645")
  })

  it("normalizes a full Basmala (vowelled) to plain consonants", () => {
    // بِسْمِ اللَّهِ → بسم الله
    const input = "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650"
    expect(normalizeArabicText(input)).toBe("\u0628\u0633\u0645 \u0627\u0644\u0644\u0647")
  })

  it("returns empty string for empty input", () => {
    expect(normalizeArabicText("")).toBe("")
  })

  it("passes through plain Latin text unchanged (no diacritics or alif to remove)", () => {
    expect(normalizeArabicText("hello")).toBe("hello")
  })

  it("result contains no characters in the diacritic Unicode ranges", () => {
    const input = "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u0647"
    const result = normalizeArabicText(input)
    expect(result).not.toMatch(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/)
  })
})

// ---------------------------------------------------------------------------
// normalizeArabicTextForDisplay
// ---------------------------------------------------------------------------
// Intentionally does NOT remove diacritics — same code path as
// normalizeArabicText when USE_HARAKAT_MATCHING=true.
describe("normalizeArabicTextForDisplay", () => {
  it("preserves diacritical marks (does not strip harakat)", () => {
    // بِسْمِ — kasra and sukun must survive
    const input = "\u0628\u0650\u0633\u0652\u0645\u0650"
    const result = normalizeArabicTextForDisplay(input)
    expect(result).toContain("\u0650") // kasra present
    expect(result).toContain("\u0652") // sukun present
    expect(result).toBe(input)         // nothing else changed
  })

  it("normalizes alif variants even while keeping diacritics", () => {
    // أِ (alif with hamza + kasra) — alif normalized but kasra kept
    const input = "\u0623\u0650"
    expect(normalizeArabicTextForDisplay(input)).toBe("\u0627\u0650")
  })

  it("removes punctuation", () => {
    expect(normalizeArabicTextForDisplay("\u0628\u0633\u0645\u060C")).toBe("\u0628\u0633\u0645")
  })

  it("returns empty string for empty input", () => {
    expect(normalizeArabicTextForDisplay("")).toBe("")
  })
})

// ---------------------------------------------------------------------------
// levenshteinDistance
// ---------------------------------------------------------------------------
describe("levenshteinDistance", () => {
  it("returns 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0)
  })

  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0)
  })

  it("returns length of str2 when str1 is empty (all insertions)", () => {
    expect(levenshteinDistance("", "abc")).toBe(3)
  })

  it("returns length of str1 when str2 is empty (all deletions)", () => {
    expect(levenshteinDistance("abc", "")).toBe(3)
  })

  it("returns 1 for a single substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1)
  })

  it("returns 1 for a single insertion", () => {
    expect(levenshteinDistance("abc", "abcd")).toBe(1)
  })

  it("returns 1 for a single deletion", () => {
    expect(levenshteinDistance("abcd", "abc")).toBe(1)
  })

  it("handles the classic kitten→sitting example (distance 3)", () => {
    // k→s, e→i, insert g
    expect(levenshteinDistance("kitten", "sitting")).toBe(3)
  })

  it("returns max length when strings share no characters", () => {
    // abc vs xyz — 3 substitutions
    expect(levenshteinDistance("abc", "xyz")).toBe(3)
  })

  it("handles single-character strings that differ", () => {
    expect(levenshteinDistance("a", "b")).toBe(1)
  })

  it("handles single-character strings that match", () => {
    expect(levenshteinDistance("a", "a")).toBe(0)
  })

  it("works correctly with Arabic characters", () => {
    // بسم vs بصم — one substitution (س→ص)
    expect(levenshteinDistance("\u0628\u0633\u0645", "\u0628\u0635\u0645")).toBe(1)
  })

  it("is order-sensitive (not symmetric in cost, but symmetric by definition)", () => {
    // Levenshtein is symmetric: d(a,b) === d(b,a)
    expect(levenshteinDistance("abc", "abcd")).toBe(levenshteinDistance("abcd", "abc"))
  })
})

// ---------------------------------------------------------------------------
// calculateSimilarity
// ---------------------------------------------------------------------------
describe("calculateSimilarity", () => {
  it("returns 1.0 for two empty strings", () => {
    // maxLength === 0 → returns 1 (special case)
    expect(calculateSimilarity("", "")).toBe(1)
  })

  it("returns 1.0 for identical strings", () => {
    expect(calculateSimilarity("abc", "abc")).toBe(1)
  })

  it("returns 0.0 when one string is empty and the other is not", () => {
    // distance = len("abc") = 3, maxLength = 3 → 1 - 3/3 = 0
    expect(calculateSimilarity("abc", "")).toBe(0)
    expect(calculateSimilarity("", "abc")).toBe(0)
  })

  it("returns a value between 0 and 1 for partially matching strings", () => {
    const result = calculateSimilarity("abc", "abd")
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })

  it("returns a higher score for strings that differ by fewer characters", () => {
    const closeMatch = calculateSimilarity("abcdef", "abcde_")  // 1 substitution
    const farMatch = calculateSimilarity("abcdef", "xyz___")    // 4+ substitutions
    expect(closeMatch).toBeGreaterThan(farMatch)
  })

  it("returns 1.0 for identical Arabic strings", () => {
    expect(calculateSimilarity("\u0628\u0633\u0645", "\u0628\u0633\u0645")).toBe(1)
  })

  it("returns 1.0 when one string has diacritics and the other does not (normalization)", () => {
    // بِسْمِ and بسم should be equal after normalization removes harakat
    const withHarakat = "\u0628\u0650\u0633\u0652\u0645\u0650"
    const withoutHarakat = "\u0628\u0633\u0645"
    expect(calculateSimilarity(withHarakat, withoutHarakat)).toBe(1)
  })

  it("returns 1.0 when alif variants differ but normalize to the same form", () => {
    // أ (U+0623) and ا (U+0627) both normalize to ا
    expect(calculateSimilarity("\u0623\u0644\u0645", "\u0627\u0644\u0645")).toBe(1)
  })

  it("returns a value between 0 and 1 for partially matching Arabic strings", () => {
    // بسم الله vs بسم — second is a prefix of the first
    const result = calculateSimilarity("\u0628\u0633\u0645 \u0627\u0644\u0644\u0647", "\u0628\u0633\u0645")
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })

  it("similarity scores are in [0, 1] for all inputs", () => {
    const pairs: [string, string][] = [
      ["", ""],
      ["a", ""],
      ["", "a"],
      ["hello", "hello"],
      ["hello", "world"],
      ["\u0628\u0633\u0645", "\u0627\u0644\u0644\u0647"],
    ]
    for (const [a, b] of pairs) {
      const score = calculateSimilarity(a, b)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })
})
