"use client";

import React, { useState } from "react";
import { ChecklistResponse, SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  ListChecks,
  Calendar,
  HelpCircle,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";

interface ChecklistViewProps {
  data: ChecklistResponse | null;
  isLoading: boolean;
  language: SupportedLanguage;
  onRunChecklist: () => void;
  canRun: boolean;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  data,
  isLoading,
  language,
  onRunChecklist,
  canRun,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleTask = (idx: number) => {
    setCompletedTasks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyChecklist = () => {
    if (!data) return;
    const actionsText = data.immediateActions
      .map((a, i) => `[${completedTasks[i] ? "X" : " "}] [${a.priority.toUpperCase()}] ${a.task} - ${a.rationale}`)
      .join("\n");
    const deadlinesText = data.importantDeadlines
      .map((d) => `• ${d.dateOrWindow}: ${d.description} (Risk: ${d.penaltyOrRisk})`)
      .join("\n");
    const questionsText = data.lawyerQuestions
      .map((q) => `• [${q.category}] ${q.question}\n  Why ask: ${q.reasonToAsk}\n  Red flag: ${q.potentialRedFlag}`)
      .join("\n\n");

    const fullExport = `CLAUSECLEAR ACTION CHECKLIST & LEGAL CONSULTATION GUIDE\n\nACTIONS:\n${actionsText}\n\nDEADLINES:\n${deadlinesText}\n\nQUESTIONS FOR LAWYER:\n${questionsText}`;
    navigator.clipboard.writeText(fullExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityBadge = (priority: "urgent" | "important" | "recommended") => {
    switch (priority) {
      case "urgent":
        return (
          <span className="rounded-full bg-md-error-container px-2.5 py-0.5 text-2xs font-bold text-md-on-error-container border border-md-error/30">
            {t.checklist.priorityUrgent}
          </span>
        );
      case "important":
        return (
          <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-2xs font-bold text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            {t.checklist.priorityImportant}
          </span>
        );
      case "recommended":
        return (
          <span className="rounded-full bg-md-secondary-container px-2.5 py-0.5 text-2xs font-medium text-md-on-secondary-container border border-md-outline/20">
            {t.checklist.priorityRecommended}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-md-surface-container p-5 rounded-[24px] border border-md-outline/15 shadow-md-elevation-1 transition-all duration-300">
        <div>
          <h3 className="text-lg font-medium text-md-on-surface flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </div>
            {t.checklist.title}
          </h3>
          <p className="text-xs text-md-on-surface-variant mt-1 ml-11">
            Turn complex provisions into actionable next steps and attorney consultation questions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {data && (
            <button
              type="button"
              onClick={copyChecklist}
              className="inline-flex items-center gap-1.5 rounded-full border border-md-outline/25 bg-md-surface px-4 py-2 text-xs font-medium text-md-on-surface hover:bg-md-primary/10 hover:border-md-primary transition-all duration-200 active:scale-95 shadow-xs"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-md-on-surface-variant" />}
              {copied ? t.actions.copied : t.actions.copy}
            </button>
          )}

          <button
            type="button"
            onClick={onRunChecklist}
            disabled={!canRun || isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary px-6 py-2.5 text-sm font-medium shadow-md-elevation-1 hover:shadow-md-elevation-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.actions.loading}
              </>
            ) : (
              t.actions.generateChecklistBtn
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {data ? (
        <div className="space-y-6">
          {/* Action Items List */}
          <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-4">
            <h4 className="text-base font-semibold text-md-on-surface flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              {t.checklist.actionsTitle}
            </h4>

            <div className="divide-y divide-md-outline/10">
              {data.immediateActions.map((action, idx) => {
                const isChecked = !!completedTasks[idx];
                return (
                  <div key={idx} className="py-3.5 flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      id={`action-task-${idx}`}
                      checked={isChecked}
                      onChange={() => toggleTask(idx)}
                      className="mt-1 h-4 w-4 rounded border-md-outline text-md-primary focus:ring-md-primary cursor-pointer accent-md-primary"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`action-task-${idx}`}
                          className={`text-sm font-medium cursor-pointer transition-colors ${
                            isChecked
                              ? "line-through text-md-on-surface-variant/50"
                              : "text-md-on-surface"
                          }`}
                        >
                          {action.task}
                        </label>
                        {getPriorityBadge(action.priority)}
                      </div>
                      <p className="text-xs text-md-on-surface-variant leading-relaxed">
                        {action.rationale}
                      </p>
                      {action.relevantQuote && (
                        <p className="text-2xs text-md-on-surface-variant/80 italic">
                          Basis: &ldquo;{action.relevantQuote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Important Deadlines */}
          {data.importantDeadlines.length > 0 && (
            <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-xs space-y-4">
              <h4 className="text-base font-semibold text-md-on-surface flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </div>
                {t.checklist.deadlinesTitle}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.importantDeadlines.map((dl, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-md-outline/15 bg-md-surface-container-low/70 space-y-1.5 hover:shadow-xs transition-all duration-200"
                  >
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-xs font-bold">
                      {dl.dateOrWindow}
                    </span>
                    <p className="text-xs text-md-on-surface font-medium">
                      {dl.description}
                    </p>
                    <p className="text-2xs text-md-error">
                      Risk if missed: {dl.penaltyOrRisk}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions to Bring to a Lawyer */}
          <div className="rounded-[24px] border border-md-outline/15 bg-md-secondary-container/25 p-6 shadow-xs space-y-4">
            <div>
              <h4 className="text-base font-semibold text-md-on-secondary-container flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </div>
                {t.checklist.lawyerQuestionsTitle}
              </h4>
              <p className="text-xs text-md-on-surface-variant mt-1 ml-10">
                {t.checklist.lawyerQuestionsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.lawyerQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-[20px] border border-md-outline/15 bg-md-surface-container p-5 shadow-xs space-y-2.5 hover:shadow-md-elevation-1 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-md-secondary-container px-3 py-0.5 text-xs font-bold text-md-on-secondary-container uppercase tracking-wider">
                      {q.category}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-md-on-surface">
                    &ldquo;{q.question}&rdquo;
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-1">
                    <div className="rounded-xl bg-md-surface-container-low p-3 text-md-on-surface">
                      <span className="font-bold text-md-on-surface block mb-1">
                        {t.checklist.whyAsk}:
                      </span>
                      {q.reasonToAsk}
                    </div>
                    <div className="rounded-xl bg-md-error-container/40 p-3 text-md-on-error-container border border-md-error/20">
                      <span className="font-bold text-md-error block mb-1">
                        {t.checklist.potentialRedFlag}:
                      </span>
                      {q.potentialRedFlag}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border-2 border-dashed border-md-outline/20 p-12 text-center text-md-on-surface-variant bg-md-surface-container/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-md-primary/10 text-md-primary mx-auto mb-3">
            <ListChecks className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-md-on-surface">Ready to generate action items.</p>
          <p className="text-xs text-md-on-surface-variant mt-1 max-w-md mx-auto">
            Click &ldquo;{t.actions.generateChecklistBtn}&rdquo; to create a personalized legal checklist and lawyer consultation guide.
          </p>
        </div>
      )}
    </div>
  );
};
