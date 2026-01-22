/**
 * Translation Router
 *
 * API endpoints for auto-translation functionality.
 * Supports English-French translation for bilingual content.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  translate,
  translateFields,
  isTranslationConfigured,
  getTranslationProvider,
  storeTranslation,
  getStoredTranslation,
} from "@/server/services/translation-service";

export const translationRouter = router({
  /**
   * Translate a single text field
   */
  translate: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        targetLanguage: z.enum(["en", "fr"]),
        skipCache: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await translate(input.text, input.targetLanguage, {
        skipCache: input.skipCache,
      });

      return {
        translatedText: result.translatedText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        provider: result.provider,
        cached: result.cached,
      };
    }),

  /**
   * Translate multiple fields at once (more efficient for forms)
   */
  translateFields: protectedProcedure
    .input(
      z.object({
        fields: z.record(z.string(), z.string()),
        targetLanguage: z.enum(["en", "fr"]),
        skipCache: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results = await translateFields(
        input.fields as Record<string, string>,
        input.targetLanguage,
        { skipCache: input.skipCache }
      );

      return {
        translations: results,
        targetLanguage: input.targetLanguage,
      };
    }),

  /**
   * Check if translation service is available
   */
  getStatus: protectedProcedure.query(async () => {
    const isConfigured = isTranslationConfigured();
    const provider = getTranslationProvider();

    return {
      available: isConfigured,
      provider,
      supportedLanguages: ["en", "fr"],
    };
  }),

  /**
   * Store a manually edited translation for future reference
   */
  saveTranslation: protectedProcedure
    .input(
      z.object({
        sourceText: z.string().min(1),
        translatedText: z.string().min(1),
        sourceLanguage: z.enum(["en", "fr"]),
        targetLanguage: z.enum(["en", "fr"]),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        fieldName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await storeTranslation({
        sourceText: input.sourceText,
        translatedText: input.translatedText,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldName: input.fieldName,
      });

      return { success: true };
    }),

  /**
   * Get a previously stored translation
   */
  getStoredTranslation: protectedProcedure
    .input(
      z.object({
        sourceText: z.string().min(1),
        sourceLanguage: z.enum(["en", "fr"]),
        targetLanguage: z.enum(["en", "fr"]),
      })
    )
    .query(async ({ input }) => {
      const translation = await getStoredTranslation({
        sourceText: input.sourceText,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      });

      return {
        translatedText: translation,
        found: !!translation,
      };
    }),
});

export default translationRouter;
