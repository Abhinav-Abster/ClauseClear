import { Type } from "@google/genai";

/**
 * Gemini-native OpenAPI 3.0 response schemas for structured generation.
 * These mirror the Zod schemas in lib/validation.ts to enforce JSON structure
 * at the model generation layer, saving prompt tokens and eliminating parse retries.
 */

export const SIMPLIFY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    documentType: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          originalSnippet: { type: Type.STRING },
          plainLanguageSummary: { type: Type.STRING },
          keyTakeaway: { type: Type.STRING },
        },
        required: ["heading", "originalSnippet", "plainLanguageSummary", "keyTakeaway"],
      },
    },
    glossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          contextInDoc: { type: Type.STRING },
        },
        required: ["term", "definition", "contextInDoc"],
      },
    },
  },
  required: ["summary", "documentType", "sections", "glossary"],
};

export const SECTION_SIMPLIFY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    heading: { type: Type.STRING },
    plainLanguageSummary: { type: Type.STRING },
    keyTakeaway: { type: Type.STRING },
    glossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          contextInDoc: { type: Type.STRING },
        },
        required: ["term", "definition", "contextInDoc"],
      },
    },
  },
  required: ["heading", "plainLanguageSummary", "keyTakeaway", "glossary"],
};

export const SYNTHESIS_SIMPLIFY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    documentType: { type: Type.STRING },
    glossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          contextInDoc: { type: Type.STRING },
        },
        required: ["term", "definition", "contextInDoc"],
      },
    },
  },
  required: ["summary", "documentType", "glossary"],
};

export const REFINE_RISK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refinedClauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["obligation", "deadline", "risk", "unusual_term"],
          },
          severity: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
          exactQuote: { type: Type.STRING },
          explanation: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ["title", "type", "severity", "exactQuote", "explanation", "recommendation"],
      },
    },
    refinedExecutiveSummary: { type: Type.STRING },
  },
  required: ["refinedClauses"],
};

export const ANALYZE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallRiskLevel: {
      type: Type.STRING,
      enum: ["low", "medium", "high"],
    },
    executiveSummary: { type: Type.STRING },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["obligation", "deadline", "risk", "unusual_term"],
          },
          severity: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
          exactQuote: { type: Type.STRING },
          explanation: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ["title", "type", "severity", "exactQuote", "explanation", "recommendation"],
      },
    },
    deadlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          timeframe: { type: Type.STRING },
          triggerEvent: { type: Type.STRING },
          consequenceOfMissing: { type: Type.STRING },
          exactQuote: { type: Type.STRING },
        },
        required: ["title", "timeframe", "triggerEvent", "consequenceOfMissing", "exactQuote"],
      },
    },
  },
  required: ["overallRiskLevel", "executiveSummary", "clauses", "deadlines"],
};

export const ASK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isCoveredInDocument: { type: Type.BOOLEAN },
    answer: { type: Type.STRING },
    relevantQuotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    suggestedFollowUps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    informationalDisclaimer: { type: Type.STRING },
  },
  required: [
    "isCoveredInDocument",
    "answer",
    "relevantQuotes",
    "suggestedFollowUps",
    "informationalDisclaimer",
  ],
};

export const CHECKLIST_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    immediateActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task: { type: Type.STRING },
          priority: {
            type: Type.STRING,
            enum: ["urgent", "important", "recommended"],
          },
          rationale: { type: Type.STRING },
          relevantQuote: { type: Type.STRING },
        },
        required: ["task", "priority", "rationale", "relevantQuote"],
      },
    },
    importantDeadlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dateOrWindow: { type: Type.STRING },
          description: { type: Type.STRING },
          penaltyOrRisk: { type: Type.STRING },
        },
        required: ["dateOrWindow", "description", "penaltyOrRisk"],
      },
    },
    lawyerQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          question: { type: Type.STRING },
          reasonToAsk: { type: Type.STRING },
          potentialRedFlag: { type: Type.STRING },
        },
        required: ["category", "question", "reasonToAsk", "potentialRedFlag"],
      },
    },
  },
  required: ["immediateActions", "importantDeadlines", "lawyerQuestions"],
};

export const COMPARE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    comparisonPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          documentAProvision: { type: Type.STRING },
          documentBProvision: { type: Type.STRING },
          moreFavorableToUser: {
            type: Type.STRING,
            enum: ["documentA", "documentB", "equal", "unclear"],
          },
          favourabilityReasoning: { type: Type.STRING },
        },
        required: [
          "topic",
          "documentAProvision",
          "documentBProvision",
          "moreFavorableToUser",
          "favourabilityReasoning",
        ],
      },
    },
    uniqueToDocumentA: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause: { type: Type.STRING },
          summary: { type: Type.STRING },
          significance: { type: Type.STRING },
        },
        required: ["clause", "summary", "significance"],
      },
    },
    uniqueToDocumentB: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause: { type: Type.STRING },
          summary: { type: Type.STRING },
          significance: { type: Type.STRING },
        },
        required: ["clause", "summary", "significance"],
      },
    },
    keyRecommendationsForReview: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "summary",
    "comparisonPoints",
    "uniqueToDocumentA",
    "uniqueToDocumentB",
    "keyRecommendationsForReview",
  ],
};
