/**
 * Translation Service
 *
 * Provides auto-translation between English and French using external APIs.
 * Supports DeepL (preferred) and Google Translate as fallback.
 * Includes in-memory caching to reduce API calls.
 */

import { prisma } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export type TranslationProvider = "deepl" | "google" | "mock";

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: "en" | "fr";
  targetLanguage: "en" | "fr";
  provider: TranslationProvider;
  cached: boolean;
}

export interface TranslationOptions {
  provider?: TranslationProvider;
  skipCache?: boolean;
}

// =============================================================================
// CACHE
// =============================================================================

// In-memory cache for translations (cleared on server restart)
// Format: Map<hash, { text: string, timestamp: number }>
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cache key from source text and language pair
 */
function getCacheKey(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): string {
  // Simple hash for cache key
  const normalized = text.trim().toLowerCase();
  return `${sourceLanguage}-${targetLanguage}-${hashString(normalized)}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cached translation if exists and not expired
 */
function getCachedTranslation(key: string): string | null {
  const cached = translationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }
  // Remove expired cache entry
  if (cached) {
    translationCache.delete(key);
  }
  return null;
}

/**
 * Store translation in cache
 */
function setCachedTranslation(key: string, text: string): void {
  translationCache.set(key, { text, timestamp: Date.now() });

  // Prevent cache from growing too large (max 1000 entries)
  if (translationCache.size > 1000) {
    // Remove oldest entries
    const entries = Array.from(translationCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100; i++) {
      translationCache.delete(entries[i][0]);
    }
  }
}

// =============================================================================
// TRANSLATION PROVIDERS
// =============================================================================

/**
 * Translate using DeepL API
 */
async function translateWithDeepL(
  text: string,
  targetLanguage: "en" | "fr"
): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY not configured");
  }

  // DeepL uses EN-US/EN-GB for English, FR for French
  const targetLang = targetLanguage === "en" ? "EN-US" : "FR";

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}

/**
 * Translate using Google Cloud Translation API
 */
async function translateWithGoogle(
  text: string,
  targetLanguage: "en" | "fr"
): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY not configured");
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: "text",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * Mock translation for development/testing
 * Adds a prefix to indicate it's a mock translation
 */
function mockTranslate(text: string, targetLanguage: "en" | "fr"): string {
  if (targetLanguage === "fr") {
    // Simple mock: add [FR] prefix and some French-like modifications
    return `[FR] ${text}`;
  } else {
    // Simple mock: add [EN] prefix
    return `[EN] ${text}`;
  }
}

// =============================================================================
// MAIN TRANSLATION FUNCTIONS
// =============================================================================

/**
 * Determine which provider to use based on configuration
 */
function getConfiguredProvider(): TranslationProvider {
  if (process.env.DEEPL_API_KEY) {
    return "deepl";
  }
  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    return "google";
  }
  // Fall back to mock in development
  if (process.env.NODE_ENV === "development") {
    return "mock";
  }
  throw new Error("No translation API configured. Set DEEPL_API_KEY or GOOGLE_TRANSLATE_API_KEY");
}

/**
 * Translate text to the target language
 *
 * @param text - The text to translate
 * @param targetLanguage - Target language code ('en' or 'fr')
 * @param options - Translation options
 * @returns Translation result with metadata
 */
export async function translate(
  text: string,
  targetLanguage: "en" | "fr",
  options: TranslationOptions = {}
): Promise<TranslationResult> {
  const sourceLanguage = targetLanguage === "en" ? "fr" : "en";
  const { provider = getConfiguredProvider(), skipCache = false } = options;

  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      return {
        translatedText: cached,
        sourceLanguage,
        targetLanguage,
        provider,
        cached: true,
      };
    }
  }

  // Perform translation
  let translatedText: string;

  switch (provider) {
    case "deepl":
      translatedText = await translateWithDeepL(text, targetLanguage);
      break;
    case "google":
      translatedText = await translateWithGoogle(text, targetLanguage);
      break;
    case "mock":
      translatedText = mockTranslate(text, targetLanguage);
      break;
    default:
      throw new Error(`Unknown translation provider: ${provider}`);
  }

  // Cache the result
  const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
  setCachedTranslation(cacheKey, translatedText);

  return {
    translatedText,
    sourceLanguage,
    targetLanguage,
    provider,
    cached: false,
  };
}

/**
 * Translate English text to French
 */
export async function translateToFrench(
  text: string,
  options: TranslationOptions = {}
): Promise<string> {
  const result = await translate(text, "fr", options);
  return result.translatedText;
}

/**
 * Translate French text to English
 */
export async function translateToEnglish(
  text: string,
  options: TranslationOptions = {}
): Promise<string> {
  const result = await translate(text, "en", options);
  return result.translatedText;
}

/**
 * Translate multiple fields at once (more efficient for forms)
 */
export async function translateFields(
  fields: Record<string, string>,
  targetLanguage: "en" | "fr",
  options: TranslationOptions = {}
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Process all translations in parallel
  const entries = Object.entries(fields).filter(([, value]) => value?.trim());
  const translations = await Promise.all(
    entries.map(async ([key, value]) => {
      const result = await translate(value, targetLanguage, options);
      return [key, result.translatedText] as const;
    })
  );

  for (const [key, value] of translations) {
    results[key] = value;
  }

  return results;
}

// =============================================================================
// DATABASE INTEGRATION
// =============================================================================

/**
 * Store a translation in the database for long-term caching
 * This is useful for frequently translated content
 */
export async function storeTranslation(params: {
  sourceText: string;
  translatedText: string;
  sourceLanguage: "en" | "fr";
  targetLanguage: "en" | "fr";
  entityType?: string;
  entityId?: string;
  fieldName?: string;
}): Promise<void> {
  const { sourceText, translatedText, sourceLanguage, targetLanguage, entityType, entityId, fieldName } = params;

  await prisma.translationCache.upsert({
    where: {
      sourceHash_sourceLanguage_targetLanguage: {
        sourceHash: hashString(sourceText.trim().toLowerCase()),
        sourceLanguage,
        targetLanguage,
      },
    },
    create: {
      sourceHash: hashString(sourceText.trim().toLowerCase()),
      sourceText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      entityType,
      entityId,
      fieldName,
    },
    update: {
      translatedText,
      entityType,
      entityId,
      fieldName,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get a stored translation from the database
 */
export async function getStoredTranslation(params: {
  sourceText: string;
  sourceLanguage: "en" | "fr";
  targetLanguage: "en" | "fr";
}): Promise<string | null> {
  const { sourceText, sourceLanguage, targetLanguage } = params;

  const cached = await prisma.translationCache.findUnique({
    where: {
      sourceHash_sourceLanguage_targetLanguage: {
        sourceHash: hashString(sourceText.trim().toLowerCase()),
        sourceLanguage,
        targetLanguage,
      },
    },
  });

  return cached?.translatedText ?? null;
}

/**
 * Check if translation service is configured
 */
export function isTranslationConfigured(): boolean {
  return !!(
    process.env.DEEPL_API_KEY ||
    process.env.GOOGLE_TRANSLATE_API_KEY ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Get the configured translation provider name
 */
export function getTranslationProvider(): TranslationProvider | null {
  if (process.env.DEEPL_API_KEY) return "deepl";
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  if (process.env.NODE_ENV === "development") return "mock";
  return null;
}
