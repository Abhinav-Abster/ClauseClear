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
          <span className="rounded bg-red-100 dark:bg-red-950 px-2 py-0.5 text-2xs font-bold text-red-700 dark:text-red-300">
            {t.checklist.priorityUrgent}
          </span>
        );
      case "important":
        return (
          <span className="rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-2xs font-bold text-amber-800 dark:text-amber-300">
            {t.checklist.priorityImportant}
          </span>
        );
      case "recommended":
        return (
          <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-2xs font-medium text-blue-700 dark:text-blue-300">
            {t.checklist.priorityRecommended}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {t.checklist.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Turn complex provisions into actionable next steps and attorney consultation questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <button
              type="button"
              onClick={copyChecklist}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? t.actions.copied : t.actions.copy}
            </button>
          )}

          <button
            type="button"
            onClick={onRunChecklist}
            disabled={!canRun || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              {t.checklist.actionsTitle}
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.immediateActions.map((action, idx) => {
                const isChecked = !!completedTasks[idx];
                return (
                  <div key={idx} className="py-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`action-task-${idx}`}
                      checked={isChecked}
                      onChange={() => toggleTask(idx)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`action-task-${idx}`}
                          className={`text-sm font-medium cursor-pointer ${
                            isChecked
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {action.task}
                        </label>
                        {getPriorityBadge(action.priority)}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {action.rationale}
                      </p>
                      {action.relevantQuote && (
                        <p className="text-2xs text-slate-400 italic">
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
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-600" aria-hidden="true" />
                {t.checklist.deadlinesTitle}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.importantDeadlines.map((dl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1"
                  >
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold">
                      {dl.dateOrWindow}
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      {dl.description}
                    </p>
                    <p className="text-2xs text-red-600 dark:text-red-400">
                      Risk if missed: {dl.penaltyOrRisk}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions to Bring to a Lawyer */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10 p-5 shadow-xs space-y-4">
            <div>
              <h4 className="text-base font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />
                {t.checklist.lawyerQuestionsTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t.checklist.lawyerQuestionsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.lawyerQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      {q.category}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    &ldquo;{q.question}&rdquo;
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                        {t.checklist.whyAsk}:
                      </span>
                      {q.reasonToAsk}
                    </div>
                    <div className="rounded bg-red-50 dark:bg-red-950/30 p-2 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/50">
                      <span className="font-bold text-red-900 dark:text-red-200 block mb-0.5">
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
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
          <ListChecks className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium">Ready to generate action items.</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;{t.actions.generateChecklistBtn}&rdquo; to create a personalized legal checklist and lawyer consultation guide.
          </p>
        </div>
      )}
    </div>
  );
};
