"use client";

import React, { useState } from "react";
import { AskResponse, SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Quote,
  HelpCircle,
  Loader2,
} from "lucide-react";

interface QAMessage {
  role: "user" | "assistant";
  content: string;
  responseMeta?: AskResponse;
}

interface AskViewProps {
  documentText: string;
  language: SupportedLanguage;
  canRun: boolean;
}

export const AskView: React.FC<AskViewProps> = ({
  documentText,
  language,
  canRun,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    "What is the exact monthly rent and security deposit?",
    "Under what conditions can the landlord enter the property?",
    "What penalties apply if rent is paid late?",
    "Can the tenant break or terminate the lease early?",
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const activeQuestion = (queryToAsk || question).trim();
    if (!activeQuestion || !canRun || isLoading) return;

    setError(null);
    setQuestion("");
    const newHistory: QAMessage[] = [...messages, { role: "user", content: activeQuestion }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: documentText,
          question: activeQuestion,
          history: historyPayload,
          language,
        }),
      });

      const data: AskResponse & { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to answer question");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          responseMeta: data,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error contacting assistant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-md-surface-container p-5 rounded-[24px] border border-md-outline/15 shadow-md-elevation-1 transition-all duration-300">
        <h3 className="text-lg font-medium text-md-on-surface flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          {t.ask.title}
        </h3>
        <p className="text-xs text-md-on-surface-variant mt-1 ml-11">
          {t.ask.subtitle}
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="bg-md-surface-container-low p-4 rounded-[24px] border border-md-outline/15">
        <span className="text-xs font-semibold text-md-on-surface-variant block mb-2 px-1">
          {t.ask.suggestedQuestionsTitle}:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={!canRun || isLoading}
              className="rounded-full bg-md-surface px-3.5 py-1.5 text-xs font-medium text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10 hover:border-md-primary transition-all duration-200 active:scale-95 disabled:opacity-50 text-left shadow-xs"
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        role="log"
        aria-live="polite"
        className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs min-h-[320px] max-h-[500px] overflow-y-auto space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-md-on-surface-variant">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-md-primary/10 text-md-primary mb-3">
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-md-on-surface">No questions asked yet.</p>
            <p className="text-xs text-md-on-surface-variant mt-1 max-w-sm">
              Ask about rent, security deposits, landlord access, or early termination.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-[20px] px-5 py-3.5 text-sm leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-md-primary text-md-on-primary rounded-tr-xs"
                    : "bg-md-surface-container-low text-md-on-surface rounded-tl-xs border border-md-outline/15"
                }`}
              >
                {/* Assistant Metadata Badges */}
                {msg.role === "assistant" && msg.responseMeta && (
                  <div className="mb-2">
                    {msg.responseMeta.isCoveredInDocument ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-2xs font-bold text-emerald-900 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {t.ask.groundedInDoc}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-2xs font-bold text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {t.ask.notInDocAlert}
                      </span>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Grounding Quotes */}
                {msg.responseMeta?.relevantQuotes && msg.responseMeta.relevantQuotes.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-md-outline/15 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-md-primary block flex items-center gap-1">
                      <Quote className="h-2.5 w-2.5" aria-hidden="true" />
                      {t.ask.sourceEvidence}:
                    </span>
                    {msg.responseMeta.relevantQuotes.map((q, qIdx) => (
                      <p key={qIdx} className="text-2xs italic font-mono text-md-on-surface-variant">
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-md-on-surface-variant text-xs p-2">
            <Loader2 className="h-4 w-4 animate-spin text-md-primary" aria-hidden="true" />
            <span>Consulting document text with Gemini...</span>
          </div>
        )}
      </div>

      {/* Question Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex gap-2.5"
      >
        <label htmlFor="qa-input" className="sr-only">
          {t.ask.placeholder}
        </label>
        <input
          id="qa-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.ask.placeholder}
          disabled={!canRun || isLoading}
          className="flex-1 rounded-full border border-md-outline/25 bg-md-surface-container-low px-5 py-3 text-sm focus:outline-none focus:border-md-primary focus:bg-md-surface disabled:opacity-50 text-md-on-surface placeholder:text-md-on-surface-variant/60 shadow-xs transition-all duration-200"
        />
        <button
          type="submit"
          disabled={!question.trim() || !canRun || isLoading}
          className="inline-flex items-center gap-1.5 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary px-6 py-3 text-sm font-medium shadow-md-elevation-1 hover:shadow-md-elevation-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>{t.ask.sendBtn}</span>
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-md-error-container p-3.5 text-xs text-md-on-error-container border border-md-error/30"
        >
          {error}
        </div>
      )}
    </div>
  );
};
