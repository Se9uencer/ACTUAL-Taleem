import { normalizeArabicText, calculateSimilarity } from "./arabic-utils";
import path from "path";
import fs from "fs/promises";

// Type for a single ayah
interface Ayah {
  chapter: number;
  verse: number;
  text: string;
}

interface Assignment {
  surah: number;
  startAyah: number;
  endAyah: number;
}

interface MatchResult {
  transcription: string;
  matchedAyah: {
    surah: number;
    ayah: number;
    text: string;
    similarity: number;
    inAssignment: boolean;
  } | null;
  diff?: string;
}

// Load and flatten all ayahs from quran.json
async function getAllAyahs(): Promise<Ayah[]> {
  const quranPath = path.resolve(process.cwd(), "quran.json");
  const raw = await fs.readFile(quranPath, "utf8");
  const quran = JSON.parse(raw);
  const ayahs: Ayah[] = [];
  for (const surahNum in quran) {
    for (const ayah of quran[surahNum]) {
      ayahs.push({
        chapter: ayah.chapter,
        verse: ayah.verse,
        text: ayah.text,
      });
    }
  }
  return ayahs;
}

// Get ayahs for the assignment range
function getAssignmentAyahs(quran: any, surah: number, startAyah: number, endAyah: number): Ayah[] {
  if (!quran[surah]) return [];
  return quran[surah].filter((a: any) => a.verse >= startAyah && a.verse <= endAyah)
    .map((a: any) => ({ chapter: a.chapter, verse: a.verse, text: a.text }));
}

// Main matching function
export async function matchTranscriptionToAyahs({
  transcription,
  assignment,
  threshold,
}: {
  transcription: string;
  assignment: Assignment;
  threshold?: number;
}): Promise<MatchResult[]> {
  // Configurable threshold
  const SIM_THRESHOLD = typeof threshold === "number"
    ? threshold
    : (process.env.AYAH_MATCH_THRESHOLD ? parseFloat(process.env.AYAH_MATCH_THRESHOLD) : 0.65);

  // 1. Segment transcription (by punctuation, newlines, or every ~20 words)
  let segments = transcription
    .split(/[\n\.،؟!؛:]+/)
    .map(s => s.trim())
    .filter(Boolean);
  // Optionally, further split long segments
  segments = segments.flatMap(seg => {
    const words = seg.split(/\s+/);
    if (words.length > 20) {
      // Split every 15-20 words
      const out = [];
      for (let i = 0; i < words.length; i += 18) {
        out.push(words.slice(i, i + 18).join(" "));
      }
      return out;
    }
    return [seg];
  });

  // 2. Load ayahs
  const quranPath = path.resolve(process.cwd(), "quran.json");
  const raw = await fs.readFile(quranPath, "utf8");
  const quran = JSON.parse(raw);
  const allAyahs: Ayah[] = await getAllAyahs();
  const assignmentAyahs = getAssignmentAyahs(quran, assignment.surah, assignment.startAyah, assignment.endAyah);
  const assignmentSet = new Set(assignmentAyahs.map(a => `${a.chapter}:${a.verse}`));

  // 3. For each segment, find best ayah match
  const results: MatchResult[] = segments.map(segment => {
    const normSeg = normalizeArabicText(segment);
    let bestMatch: Ayah | null = null;
    let bestScore = 0;
    for (const ayah of allAyahs) {
      const normAyah = normalizeArabicText(ayah.text);
      const score = calculateSimilarity(normSeg, normAyah);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = ayah;
      }
    }
    let matchedAyah = null;
    if (bestMatch && bestScore >= SIM_THRESHOLD) {
      matchedAyah = {
        surah: bestMatch.chapter,
        ayah: bestMatch.verse,
        text: bestMatch.text,
        similarity: bestScore,
        inAssignment: assignmentSet.has(`${bestMatch.chapter}:${bestMatch.verse}`),
      };
    }
    return {
      transcription: segment,
      matchedAyah,
      // diff: (optional, can be added in frontend)
    };
  });
  return results;
} 