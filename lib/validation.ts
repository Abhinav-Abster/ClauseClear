import { z } from "zod";

export const MAX_DOCUMENT_LENGTH = 50000;
export const MIN_DOCUMENT_LENGTH = 20;
export const MAX_QUESTION_LENGTH = 1000;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const SupportedLanguagesSchema = z.enum(["en", "es", "fr", "pt"]).default("en");
export type SupportedLanguage = z.infer<typeof SupportedLanguagesSchema>;

// Reusable document text validator with explicit helpful error messages
export const DocumentTextSchema = z
  .string({
    required_error: "Document text is required.",
    invalid_type_error: "Document text must be a string.",
  })
  .trim()
  .min(
    MIN_DOCUMENT_LENGTH,
    `Document is too short. Please provide at least ${MIN_DOCUMENT_LENGTH} characters of text to analyze.`,
  )
  .max(
    MAX_DOCUMENT_LENGTH,
    `Document exceeds maximum length of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters. Please trim or split the document.`,
  );

// Input Schemas
export const SimplifyInputSchema = z.object({
  document: DocumentTextSchema,
  language: SupportedLanguagesSchema.optional().default("en"),
});
export type SimplifyInput = z.infer<typeof SimplifyInputSchema>;

export const AnalyzeInputSchema = z.object({
  document: DocumentTextSchema,
  language: SupportedLanguagesSchema.optional().default("en"),
});
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

export const AskInputSchema = z.object({
  document: DocumentTextSchema,
  question: z
    .string({
      required_error: "Question is required.",
    })
    .trim()
    .min(3, "Question must be at least 3 characters long.")
    .max(MAX_QUESTION_LENGTH, `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.`),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .optional()
    .default([]),
  language: SupportedLanguagesSchema.optional().default("en"),
});
export type AskInput = z.infer<typeof AskInputSchema>;

export const ChecklistInputSchema = z.object({
  document: DocumentTextSchema,
  language: SupportedLanguagesSchema.optional().default("en"),
});
export type ChecklistInput = z.infer<typeof ChecklistInputSchema>;

export const CompareInputSchema = z.object({
  documentA: DocumentTextSchema,
  documentB: DocumentTextSchema,
  labelA: z.string().trim().max(100).optional().default("Document A"),
  labelB: z.string().trim().max(100).optional().default("Document B"),
  language: SupportedLanguagesSchema.optional().default("en"),
});
export type CompareInput = z.infer<typeof CompareInputSchema>;

// Output Schemas (Validated against Gemini outputs)
export const SimplifyResponseSchema = z.object({
  summary: z.string(),
  documentType: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      originalSnippet: z.string(),
      plainLanguageSummary: z.string(),
      keyTakeaway: z.string(),
    }),
  ),
  glossary: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      contextInDoc: z.string(),
    }),
  ),
});
export type SimplifyResponse = z.infer<typeof SimplifyResponseSchema>;

export const SectionSimplifyResponseSchema = z.object({
  heading: z.string(),
  plainLanguageSummary: z.string(),
  keyTakeaway: z.string(),
  glossary: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      contextInDoc: z.string(),
    }),
  ),
});
export type SectionSimplifyResponse = z.infer<typeof SectionSimplifyResponseSchema>;

export const SynthesisSimplifyResponseSchema = z.object({
  summary: z.string(),
  documentType: z.string(),
  glossary: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      contextInDoc: z.string(),
    }),
  ),
});
export type SynthesisSimplifyResponse = z.infer<typeof SynthesisSimplifyResponseSchema>;

export const ClauseTypeSchema = z.enum(["obligation", "deadline", "risk", "unusual_term"]);
export const SeveritySchema = z.enum(["low", "medium", "high"]);

export const ClauseItemSchema = z.object({
  title: z.string(),
  type: ClauseTypeSchema,
  severity: SeveritySchema,
  exactQuote: z.string(),
  explanation: z.string(),
  recommendation: z.string(),
});
export type ClauseItem = z.infer<typeof ClauseItemSchema>;

export const DeadlineItemSchema = z.object({
  title: z.string(),
  timeframe: z.string(),
  triggerEvent: z.string(),
  consequenceOfMissing: z.string(),
  exactQuote: z.string(),
});
export type DeadlineItem = z.infer<typeof DeadlineItemSchema>;

export const AnalyzeResponseSchema = z.object({
  overallRiskLevel: SeveritySchema,
  executiveSummary: z.string(),
  clauses: z.array(ClauseItemSchema),
  deadlines: z.array(DeadlineItemSchema),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const RefineRiskResponseSchema = z.object({
  refinedClauses: z.array(ClauseItemSchema),
  refinedExecutiveSummary: z.string().optional(),
});
export type RefineRiskResponse = z.infer<typeof RefineRiskResponseSchema>;


export const AskResponseSchema = z.object({
  isCoveredInDocument: z.boolean(),
  answer: z.string(),
  relevantQuotes: z.array(z.string()),
  suggestedFollowUps: z.array(z.string()),
  informationalDisclaimer: z.string(),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;

export const ChecklistResponseSchema = z.object({
  immediateActions: z.array(
    z.object({
      task: z.string(),
      priority: z.enum(["urgent", "important", "recommended"]),
      rationale: z.string(),
      relevantQuote: z.string().optional().default(""),
    }),
  ),
  importantDeadlines: z.array(
    z.object({
      dateOrWindow: z.string(),
      description: z.string(),
      penaltyOrRisk: z.string(),
    }),
  ),
  lawyerQuestions: z.array(
    z.object({
      category: z.string(),
      question: z.string(),
      reasonToAsk: z.string(),
      potentialRedFlag: z.string(),
    }),
  ),
});
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;

export const CompareResponseSchema = z.object({
  summary: z.string(),
  comparisonPoints: z.array(
    z.object({
      topic: z.string(),
      documentAProvision: z.string(),
      documentBProvision: z.string(),
      moreFavorableToUser: z.enum(["documentA", "documentB", "equal", "unclear"]),
      favourabilityReasoning: z.string(),
    }),
  ),
  uniqueToDocumentA: z.array(
    z.object({
      clause: z.string(),
      summary: z.string(),
      significance: z.string(),
    }),
  ),
  uniqueToDocumentB: z.array(
    z.object({
      clause: z.string(),
      summary: z.string(),
      significance: z.string(),
    }),
  ),
  keyRecommendationsForReview: z.array(z.string()),
});
export type CompareResponse = z.infer<typeof CompareResponseSchema>;
