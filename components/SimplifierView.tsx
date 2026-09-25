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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-md-surface-container p-5 rounded-[24px] border border-md-outline/15 shadow-md-elevation-1 transition-all duration-300">
        <div>
          <h3 className="text-lg font-medium text-md-on-surface flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            {t.simplify.title}
          </h3>
          <p className="text-xs text-md-on-surface-variant mt-1 ml-11">
            {t.simplify.glossarySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {data && (
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center gap-1.5 rounded-full border border-md-outline/25 bg-md-surface px-4 py-2 text-xs font-medium text-md-on-surface hover:bg-md-primary/10 hover:border-md-primary transition-all duration-200 active:scale-95 shadow-xs"
              aria-label="Copy summary to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-md-on-surface-variant" />}
              {copied ? t.actions.copied : t.actions.copy}
            </button>
          )}

          <button
            type="button"
            onClick={onRunSimplify}
            disabled={!canRun || isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary px-6 py-2.5 text-sm font-medium shadow-md-elevation-1 hover:shadow-md-elevation-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
          <div className="rounded-[24px] border border-md-outline/15 bg-md-secondary-container/35 p-6 shadow-xs">
            <div className="flex items-center gap-2 text-md-on-secondary-container mb-2.5">
              <FileBadge className="h-5 w-5 text-md-primary" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.simplify.docType}: {data.documentType}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-md-on-surface font-normal">
              {data.summary}
            </p>
          </div>

          {/* Section-by-Section Translation */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant px-1">
              {t.simplify.sectionsTitle} ({data.sections.length})
            </h4>

            {data.sections.map((section, idx) => {
              const isExpanded = expandedSections[idx] ?? true;
              return (
                <div
                  key={idx}
                  className="rounded-[24px] border border-md-outline/15 bg-md-surface-container shadow-xs hover:shadow-md-elevation-2 hover:scale-[1.005] transition-all duration-300 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(idx)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between p-5 text-left font-medium text-md-on-surface hover:bg-md-primary/5 transition-colors duration-200"
                  >
                    <span className="text-base">{section.heading}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-surface-container-low text-md-on-surface-variant">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-md-outline/10 space-y-3.5">
                      {/* Plain English Meaning */}
                      <div className="mt-3">
                        <p className="text-sm leading-relaxed text-md-on-surface">
                          {section.plainLanguageSummary}
                        </p>
                      </div>

                      {/* Key Takeaway */}
                      <div className="rounded-2xl bg-md-secondary-container/50 border border-md-outline/15 p-3.5 text-xs text-md-on-secondary-container font-medium">
                        <span className="font-bold">{t.simplify.keyTakeaway}:</span> {section.keyTakeaway}
                      </div>

                      {/* Original Excerpt Reference */}
                      {section.originalSnippet && (
                        <div className="rounded-2xl bg-md-surface-container-low p-3.5 text-xs text-md-on-surface-variant italic border-l-4 border-md-primary/70">
                          <span className="not-italic font-semibold block text-2xs uppercase text-md-on-surface-variant/80 mb-0.5">
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
            <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="text-base font-semibold text-md-on-surface">
                    {t.simplify.glossaryTitle}
                  </h4>
                </div>

                {/* Glossary Search Box */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2 text-md-on-surface-variant" aria-hidden="true" />
                  <label htmlFor="glossary-search" className="sr-only">
                    Search glossary terms
                  </label>
                  <input
                    id="glossary-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter terms..."
                    className="pl-9 pr-4 py-1.5 text-xs rounded-full border border-md-outline/25 bg-md-surface-container-low focus:bg-md-surface focus:outline-none focus:border-md-primary text-md-on-surface placeholder:text-md-on-surface-variant/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredGlossary?.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-md-outline/15 p-4 bg-md-surface-container-low/70 space-y-2 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-md-primary">
                        {item.term}
                      </span>
                    </div>
                    <p className="text-xs text-md-on-surface leading-relaxed">
                      {item.definition}
                    </p>
                    {item.contextInDoc && (
                      <p className="text-2xs text-md-on-surface-variant italic">
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
        <div className="rounded-[24px] border-2 border-dashed border-md-outline/20 p-12 text-center text-md-on-surface-variant bg-md-surface-container/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-md-primary/10 text-md-primary mx-auto mb-3">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-md-on-surface">Ready to simplify.</p>
          <p className="text-xs text-md-on-surface-variant mt-1 max-w-md mx-auto">
            Click &ldquo;{t.actions.simplifyBtn}&rdquo; to generate plain-language explanations and a legal glossary.
          </p>
        </div>
      )}
    </div>
  );
};
