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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" aria-hidden="true" />
          {t.ask.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.ask.subtitle}
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">
          {t.ask.suggestedQuestionsTitle}
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={!canRun || isLoading}
              className="rounded-md bg-white dark:bg-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 text-left"
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
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs min-h-[320px] max-h-[500px] overflow-y-auto space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
            <HelpCircle className="h-8 w-8 mb-2 text-slate-300" aria-hidden="true" />
            <p className="text-sm">No questions asked yet.</p>
            <p className="text-xs text-slate-400 mt-1">
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Assistant Metadata Badges */}
                {msg.role === "assistant" && msg.responseMeta && (
                  <div className="mb-2">
                    {msg.responseMeta.isCoveredInDocument ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-2xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {t.ask.groundedInDoc}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-2xs font-bold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {t.ask.notInDocAlert}
                      </span>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Grounding Quotes */}
                {msg.responseMeta?.relevantQuotes && msg.responseMeta.relevantQuotes.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block flex items-center gap-1">
                      <Quote className="h-2.5 w-2.5" aria-hidden="true" />
                      {t.ask.sourceEvidence}:
                    </span>
                    {msg.responseMeta.relevantQuotes.map((q, qIdx) => (
                      <p key={qIdx} className="text-2xs italic font-mono text-slate-600 dark:text-slate-300">
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
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
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
        className="flex gap-2"
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
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!question.trim() || !canRun || isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>{t.ask.sendBtn}</span>
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900"
        >
          {error}
        </div>
      )}
    </div>
  );
};
