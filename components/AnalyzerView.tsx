"use client";

import React, { useState } from "react";
import { AnalyzeResponse, SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Quote,
  Calendar,
} from "lucide-react";

interface AnalyzerViewProps {
  data: AnalyzeResponse | null;
  isLoading: boolean;
  language: SupportedLanguage;
  onRunAnalyze: () => void;
  canRun: boolean;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  data,
  isLoading,
  language,
  onRunAnalyze,
  canRun,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [filterType, setFilterType] = useState<"all" | "obligation" | "deadline" | "risk">("all");

  const getSeverityBadge = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-md-error-container px-3 py-1 text-xs font-bold text-md-on-error-container border border-md-error/30 shadow-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-md-error" aria-hidden="true" />
            {t.analyze.severityHigh}
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            {t.analyze.severityMed}
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            {t.analyze.severityLow}
          </span>
        );
    }
  };

  const filteredClauses = data?.clauses.filter((clause) => {
    if (filterType === "all") return true;
    if (filterType === "obligation") return clause.type === "obligation";
    if (filterType === "deadline") return clause.type === "deadline";
    if (filterType === "risk") return clause.type === "risk" || clause.type === "unusual_term";
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-md-surface-container p-5 rounded-[24px] border border-md-outline/15 shadow-md-elevation-1 transition-all duration-300">
        <div>
          <h3 className="text-lg font-medium text-md-on-surface flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            {t.analyze.title}
          </h3>
          <p className="text-xs text-md-on-surface-variant mt-1 ml-11">
            Identify liabilities, obligations, and unusual clauses backed by exact quotes.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunAnalyze}
          disabled={!canRun || isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary px-6 py-2.5 text-sm font-medium shadow-md-elevation-1 hover:shadow-md-elevation-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t.actions.loading}
            </>
          ) : (
            t.actions.analyzeBtn
          )}
        </button>
      </div>

      {/* Results Display */}
      {data ? (
        <div className="space-y-6">
          {/* Executive Risk Overview Banner */}
          <div
            className={`rounded-[24px] border p-6 shadow-xs ${
              data.overallRiskLevel === "high"
                ? "bg-md-error-container/40 border-md-error/30"
                : data.overallRiskLevel === "medium"
                  ? "bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                  : "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant">
                {t.analyze.overallRisk}
              </span>
              {getSeverityBadge(data.overallRiskLevel)}
            </div>
            <p className="text-sm font-medium leading-relaxed text-md-on-surface">
              {data.executiveSummary}
            </p>
          </div>

          {/* Filter Tabs (Material You Filter Chips) */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter clauses by category">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                filterType === "all"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "bg-md-surface-container text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10"
              }`}
            >
              {t.analyze.filterAll} ({data.clauses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("risk")}
              aria-pressed={filterType === "risk"}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                filterType === "risk"
                  ? "bg-md-error text-md-on-error shadow-xs"
                  : "bg-md-surface-container text-md-on-surface border border-md-outline/25 hover:bg-md-error/10"
              }`}
            >
              ⚠️ {t.analyze.filterRisks}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("obligation")}
              aria-pressed={filterType === "obligation"}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                filterType === "obligation"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "bg-md-surface-container text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10"
              }`}
            >
              📌 {t.analyze.filterObligations}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("deadline")}
              aria-pressed={filterType === "deadline"}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                filterType === "deadline"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "bg-md-surface-container text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10"
              }`}
            >
              ⏰ {t.analyze.filterDeadlines}
            </button>
          </div>

          {/* Clause Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredClauses?.map((clause, idx) => (
              <div
                key={idx}
                className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs hover:shadow-md-elevation-2 hover:scale-[1.005] transition-all duration-300 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-base font-semibold text-md-on-surface">
                    {clause.title}
                  </h4>
                  {getSeverityBadge(clause.severity)}
                </div>

                {/* Verbatim Source Quote with Citation Styling */}
                <div className="rounded-2xl bg-md-surface-container-low p-3.5 text-xs border-l-4 border-md-primary">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-2xs text-md-primary mb-1">
                    <Quote className="h-3 w-3" aria-hidden="true" />
                    {t.analyze.sourceQuote}
                  </div>
                  <blockquote className="text-md-on-surface italic font-mono leading-relaxed">
                    &ldquo;{clause.exactQuote}&rdquo;
                  </blockquote>
                </div>

                {/* Practical Impact */}
                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-md-on-surface-variant block mb-1">
                    {t.analyze.practicalImpact}
                  </span>
                  <p className="text-sm text-md-on-surface leading-relaxed">
                    {clause.explanation}
                  </p>
                </div>

                {/* What to Verify / Guidance */}
                <div className="rounded-2xl bg-md-secondary-container/40 p-3.5 text-xs text-md-on-secondary-container border border-md-outline/15">
                  <span className="font-bold">{t.analyze.whatToVerify}: </span>
                  <span>{clause.recommendation}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Critical Deadlines Card */}
          {data.deadlines && data.deadlines.length > 0 && (
            <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="text-base font-semibold text-md-on-surface">
                  {t.analyze.deadlinesTitle} ({data.deadlines.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.deadlines.map((dl, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-md-outline/15 p-4 bg-md-surface-container-low/70 space-y-2 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-md-on-surface">
                        {dl.title}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {dl.timeframe}
                      </span>
                    </div>
                    <div className="text-xs text-md-on-surface-variant">
                      <span className="font-medium text-md-on-surface">Trigger:</span> {dl.triggerEvent}
                    </div>
                    <div className="text-xs text-md-error font-medium">
                      <span>Consequence:</span> {dl.consequenceOfMissing}
                    </div>
                    {dl.exactQuote && (
                      <p className="text-2xs text-md-on-surface-variant italic">
                        Source: &ldquo;{dl.exactQuote}&rdquo;
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
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-md-on-surface">Ready to analyze risks & obligations.</p>
          <p className="text-xs text-md-on-surface-variant mt-1 max-w-md mx-auto">
            Click &ldquo;{t.actions.analyzeBtn}&rdquo; to extract clauses tagged with low/medium/high severity.
          </p>
        </div>
      )}
    </div>
  );
};
