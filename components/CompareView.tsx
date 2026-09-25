"use client";

import React, { useState } from "react";
import { CompareResponse, SupportedLanguage, MAX_DOCUMENT_LENGTH } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  GitCompare,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";

interface CompareViewProps {
  language: SupportedLanguage;
}

export const CompareView: React.FC<CompareViewProps> = ({ language }) => {
  const t = UI_TRANSLATIONS[language];
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [labelA, setLabelA] = useState("Offer A (Standard)");
  const [labelB, setLabelB] = useState("Offer B (Alternative)");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadLeaseComparisonSamples = async () => {
    try {
      const [resA, resB] = await Promise.all([
        fetch("/samples/sample_lease_standard.txt").then((r) => r.text()),
        fetch("/samples/sample_lease_strict.txt").then((r) => r.text()),
      ]);
      setDocA(resA);
      setDocB(resB);
      setLabelA("Standard Lease (Oakridge)");
      setLabelB("Strict Lease (Pinnacle)");
    } catch {
      // Fallback text if static fetch isn't ready in dev mode
      setDocA("RESIDENTIAL LEASE: Rent is $2,200/mo. Deposit is $2,200. Grace period 5 days. Landlord gives 24h notice.");
      setDocB("STRICT LEASE: Rent is $2,450/mo. Deposit is $4,900. No grace period. Landlord enters anytime without notice.");
      setLabelA("Standard Lease");
      setLabelB("Strict Lease");
    }
  };

  const handleCompare = async () => {
    if (!docA.trim() || !docB.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentA: docA,
          documentB: docB,
          labelA,
          labelB,
          language,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to compare documents");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error comparing documents");
    } finally {
      setIsLoading(false);
    }
  };

  const copyComparison = () => {
    if (!data) return;
    const diffs = data.comparisonPoints
      .map(
        (cp) =>
          `[${cp.topic}]\n${labelA}: ${cp.documentAProvision}\n${labelB}: ${cp.documentBProvision}\nFavorability: ${cp.moreFavorableToUser} (${cp.favourabilityReasoning})`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(`COMPARISON: ${labelA} vs ${labelB}\n\n${data.summary}\n\n${diffs}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-md-surface-container p-5 rounded-[24px] border border-md-outline/15 shadow-md-elevation-1 flex flex-wrap items-center justify-between gap-3 transition-all duration-300">
        <div>
          <h3 className="text-lg font-medium text-md-on-surface flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
              <GitCompare className="h-5 w-5" aria-hidden="true" />
            </div>
            {t.compare.title}
          </h3>
          <p className="text-xs text-md-on-surface-variant mt-1 ml-11">
            {t.compare.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeaseComparisonSamples}
          className="rounded-full bg-md-surface hover:bg-md-primary/10 px-4 py-2 text-xs font-medium text-md-on-surface border border-md-outline/25 transition-all duration-200 active:scale-95 shadow-xs"
        >
          📋 Load Standard vs Strict Lease Comparison
        </button>
      </div>

      {/* Dual Document Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Document A Input */}
        <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="compare-doc-a" className="text-xs font-bold text-md-primary uppercase tracking-wider">
              {t.compare.docALabel}
            </label>
            <span className="text-2xs text-md-on-surface-variant">
              {docA.length.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <input
            type="text"
            value={labelA}
            onChange={(e) => setLabelA(e.target.value)}
            placeholder="Label (e.g., Offer A)"
            className="w-full text-xs font-medium px-3.5 py-2 rounded-full border border-md-outline/25 bg-md-surface-container-low text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-surface transition-all duration-200"
          />
          <textarea
            id="compare-doc-a"
            rows={8}
            value={docA}
            onChange={(e) => setDocA(e.target.value)}
            placeholder="Paste first agreement here..."
            className="w-full rounded-t-xl rounded-b-none border-0 border-b-2 border-b-md-outline p-3.5 text-xs font-mono bg-md-surface-container-low text-md-on-surface focus:outline-none focus:border-b-md-primary focus:bg-md-surface transition-all duration-200 placeholder:text-md-on-surface-variant/50"
          />
        </div>

        {/* Document B Input */}
        <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="compare-doc-b" className="text-xs font-bold text-md-tertiary uppercase tracking-wider">
              {t.compare.docBLabel}
            </label>
            <span className="text-2xs text-md-on-surface-variant">
              {docB.length.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <input
            type="text"
            value={labelB}
            onChange={(e) => setLabelB(e.target.value)}
            placeholder="Label (e.g., Offer B)"
            className="w-full text-xs font-medium px-3.5 py-2 rounded-full border border-md-outline/25 bg-md-surface-container-low text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-surface transition-all duration-200"
          />
          <textarea
            id="compare-doc-b"
            rows={8}
            value={docB}
            onChange={(e) => setDocB(e.target.value)}
            placeholder="Paste second agreement here..."
            className="w-full rounded-t-xl rounded-b-none border-0 border-b-2 border-b-md-outline p-3.5 text-xs font-mono bg-md-surface-container-low text-md-on-surface focus:outline-none focus:border-b-md-primary focus:bg-md-surface transition-all duration-200 placeholder:text-md-on-surface-variant/50"
          />
        </div>
      </div>

      {/* Trigger Comparison Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCompare}
          disabled={!docA.trim() || !docB.trim() || isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary px-8 py-3 text-sm font-medium shadow-md-elevation-1 hover:shadow-md-elevation-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t.actions.loading}
            </>
          ) : (
            t.actions.compareBtn
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-md-error-container p-3.5 text-xs text-md-on-error-container border border-md-error/30"
        >
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {data && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="rounded-[24px] border border-md-outline/15 bg-md-secondary-container/30 p-6 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant">
                {t.compare.comparisonSummary}
              </span>
              <button
                type="button"
                onClick={copyComparison}
                className="inline-flex items-center gap-1.5 rounded-full border border-md-outline/25 bg-md-surface px-3.5 py-1 text-xs font-medium text-md-on-surface hover:bg-md-primary/10 active:scale-95 transition-all duration-200 shadow-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-md-on-surface-variant" />}
                {copied ? t.actions.copied : t.actions.copy}
              </button>
            </div>
            <p className="text-sm font-medium leading-relaxed text-md-on-surface">
              {data.summary}
            </p>
          </div>

          {/* Side-by-Side Comparison Points */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant px-1">
              Clause Differences & Relative Favorability ({data.comparisonPoints.length})
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {data.comparisonPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs hover:shadow-md-elevation-2 hover:scale-[1.005] transition-all duration-300 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-md-outline/10 pb-3">
                    <span className="text-sm font-bold text-md-on-surface">
                      {pt.topic}
                    </span>

                    {/* Favorability Badge */}
                    {pt.moreFavorableToUser === "documentA" ? (
                      <span className="rounded-full bg-md-primary-container px-3 py-1 text-2xs font-bold text-md-on-primary-container border border-md-primary/20 shadow-xs">
                        ⭐ {labelA} is More Favorable
                      </span>
                    ) : pt.moreFavorableToUser === "documentB" ? (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-2xs font-bold text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
                        ⭐ {labelB} is More Favorable
                      </span>
                    ) : (
                      <span className="rounded-full bg-md-surface-container-low px-3 py-1 text-2xs font-medium text-md-on-surface-variant border border-md-outline/20">
                        Balanced / Neutral
                      </span>
                    )}
                  </div>

                  {/* Provisions Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div className="rounded-2xl bg-md-surface-container-low/70 p-4 border border-md-outline/15 space-y-1.5">
                      <span className="font-bold text-md-primary block">
                        {labelA}:
                      </span>
                      <p className="text-md-on-surface leading-relaxed font-mono text-2xs">
                        {pt.documentAProvision}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-md-surface-container-low/70 p-4 border border-md-outline/15 space-y-1.5">
                      <span className="font-bold text-md-tertiary block">
                        {labelB}:
                      </span>
                      <p className="text-md-on-surface leading-relaxed font-mono text-2xs">
                        {pt.documentBProvision}
                      </p>
                    </div>
                  </div>

                  {/* Objective Reasoning */}
                  <p className="text-xs text-md-on-surface-variant italic">
                    <span className="font-semibold not-italic text-md-on-surface">Analysis: </span>
                    {pt.favourabilityReasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Unique / Omitted Provisions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unique to Doc A */}
            <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-md-primary uppercase tracking-wider">
                Present in {labelA} (Omitted in {labelB})
              </h4>
              {data.uniqueToDocumentA.length === 0 ? (
                <p className="text-xs text-md-on-surface-variant">No unique clauses detected.</p>
              ) : (
                data.uniqueToDocumentA.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-md-surface-container-low space-y-1 text-xs border border-md-outline/10">
                    <span className="font-bold text-md-on-surface block">{item.clause}</span>
                    <p className="text-md-on-surface-variant">{item.summary}</p>
                    <p className="text-2xs text-md-primary italic font-medium">Impact: {item.significance}</p>
                  </div>
                ))
              )}
            </div>

            {/* Unique to Doc B */}
            <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-md-tertiary uppercase tracking-wider">
                Present in {labelB} (Omitted in {labelA})
              </h4>
              {data.uniqueToDocumentB.length === 0 ? (
                <p className="text-xs text-md-on-surface-variant">No unique clauses detected.</p>
              ) : (
                data.uniqueToDocumentB.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-md-surface-container-low space-y-1 text-xs border border-md-outline/10">
                    <span className="font-bold text-md-on-surface block">{item.clause}</span>
                    <p className="text-md-on-surface-variant">{item.summary}</p>
                    <p className="text-2xs text-md-tertiary italic font-medium">Impact: {item.significance}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations for Review */}
          {data.keyRecommendationsForReview.length > 0 && (
            <div className="rounded-[24px] border border-md-outline/15 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 shadow-xs space-y-2.5">
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                {t.compare.keyReviewAdvice}
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-md-on-surface leading-relaxed">
                {data.keyRecommendationsForReview.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
