"use client";

import React, { useState } from "react";
import { SimplifyResponse, SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Copy, Check, Search, FileBadge } from "lucide-react";

interface SimplifierViewProps {
  data: SimplifyResponse | null;
  isLoading: boolean;
  language: SupportedLanguage;
  onRunSimplify: () => void;
  canRun: boolean;
}

export const SimplifierView: React.FC<SimplifierViewProps> = ({
  data,
  isLoading,
  language,
  onRunSimplify,
  canRun,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [copied, setCopied] = useState(false);

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copySummary = () => {
    if (!data) return;
    const formatted = `${data.documentType}\n\nSummary:\n${data.summary}\n\nSections:\n` +
      data.sections
        .map((s) => `• ${s.heading}: ${s.plainLanguageSummary}\n  Takeaway: ${s.keyTakeaway}`)
        .join("\n\n");
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredGlossary = data?.glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.definition.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {t.simplify.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.simplify.glossarySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              aria-label="Copy summary to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? t.actions.copied : t.actions.copy}
            </button>
          )}

          <button
            type="button"
            onClick={onRunSimplify}
            disabled={!canRun || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.actions.loading}
              </>
            ) : (
              t.actions.simplifyBtn
            )}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {data ? (
        <div className="space-y-6">
          {/* Document Type & Executive Summary */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-2">
              <FileBadge className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.simplify.docType}: {data.documentType}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-normal">
              {data.summary}
            </p>
          </div>

          {/* Section-by-Section Translation */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.simplify.sectionsTitle} ({data.sections.length})
            </h4>

            {data.sections.map((section, idx) => {
              const isExpanded = expandedSections[idx] ?? true;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(idx)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-base">{section.heading}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                      {/* Plain English Meaning */}
                      <div className="mt-3">
                        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                          {section.plainLanguageSummary}
                        </p>
                      </div>

                      {/* Key Takeaway */}
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                        <span className="font-bold">{t.simplify.keyTakeaway}:</span> {section.keyTakeaway}
                      </div>

                      {/* Original Excerpt Reference */}
                      {section.originalSnippet && (
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-300 dark:border-slate-600">
                          <span className="not-italic font-semibold block text-2xs uppercase text-slate-400 mb-0.5">
                            {t.simplify.originalExcerpt}
                          </span>
                          &ldquo;{section.originalSnippet}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legal Terms Glossary */}
          {data.glossary && data.glossary.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t.simplify.glossaryTitle}
                  </h4>
                </div>

                {/* Glossary Search Box */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-2 text-slate-400" aria-hidden="true" />
                  <label htmlFor="glossary-search" className="sr-only">
                    Search glossary terms
                  </label>
                  <input
                    id="glossary-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter terms..."
                    className="pl-8 pr-3 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredGlossary?.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                        {item.term}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.definition}
                    </p>
                    {item.contextInDoc && (
                      <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
                        In this doc: {item.contextInDoc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
          <Sparkles className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium">Ready to simplify.</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;{t.actions.simplifyBtn}&rdquo; to generate plain-language explanations and a legal glossary.
          </p>
        </div>
      )}
    </div>
  );
};
