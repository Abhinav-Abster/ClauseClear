import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentInput } from "@/components/DocumentInput";
import { Header } from "@/components/Header";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SimplifierView } from "@/components/SimplifierView";
import { AnalyzerView } from "@/components/AnalyzerView";
import { AskView } from "@/components/AskView";

describe("Frontend Components & Interaction", () => {
  it("renders Header with language choices and accessibility controls", () => {
    const onLanguageChange = jest.fn();
    const onToggleHighContrast = jest.fn();
    const onChangeTextSize = jest.fn();

    render(
      <Header
        language="en"
        onLanguageChange={onLanguageChange}
        highContrast={false}
        onToggleHighContrast={onToggleHighContrast}
        textSize="normal"
        onChangeTextSize={onChangeTextSize}
      />,
    );

    expect(screen.getByText("ClauseClear")).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
    expect(screen.getByLabelText("High Contrast")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("High Contrast"));
    expect(onToggleHighContrast).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Large text size"));
    expect(onChangeTextSize).toHaveBeenCalledWith("large");
  });

  it("renders DisclaimerBanner with non-advisory notice", () => {
    render(<DisclaimerBanner language="en" />);
    expect(screen.getByText(/Informational Legal Assistance/i)).toBeInTheDocument();
    expect(screen.getByText(/does not provide legal advice/i)).toBeInTheDocument();
  });

  it("renders DocumentInput and allows text editing and sample loading", () => {
    const onDocumentChange = jest.fn();
    const onLoadSample = jest.fn();

    render(
      <DocumentInput
        documentText="Sample contract text"
        onDocumentChange={onDocumentChange}
        language="en"
        onLoadSample={onLoadSample}
      />,
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Sample contract text");

    fireEvent.change(textarea, { target: { value: "Updated contract text" } });
    expect(onDocumentChange).toHaveBeenCalledWith("Updated contract text");

    const sampleBtn = screen.getByText(/Standard Lease/i);
    fireEvent.click(sampleBtn);
    expect(onLoadSample).toHaveBeenCalledWith("standard");
  });

  it("renders SimplifierView with section summaries and glossary", () => {
    const mockData = {
      summary: "High-level overview of agreement.",
      documentType: "Residential Lease Agreement",
      sections: [
        {
          heading: "Section 1: Rent",
          originalSnippet: "Rent is $2,200",
          plainLanguageSummary: "Monthly rent is $2,200.",
          keyTakeaway: "Due on the first.",
        },
      ],
      glossary: [
        {
          term: "Escrow",
          definition: "A secure third-party holding account.",
          contextInDoc: "Security deposit escrow.",
        },
      ],
    };

    render(
      <SimplifierView
        data={mockData}
        isLoading={false}
        language="en"
        onRunSimplify={jest.fn()}
        canRun={true}
      />,
    );

    expect(screen.getByText("Residential Lease Agreement", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Section 1: Rent")).toBeInTheDocument();
    expect(screen.getByText("Monthly rent is $2,200.")).toBeInTheDocument();
    expect(screen.getByText("Escrow")).toBeInTheDocument();
  });

  it("renders AnalyzerView with severity tags and verbatim quote", () => {
    const mockData = {
      overallRiskLevel: "high" as const,
      executiveSummary: "High-risk agreement.",
      clauses: [
        {
          title: "Acceleration Clause",
          type: "risk" as const,
          severity: "high" as const,
          exactQuote: "Entire rent becomes due immediately on default.",
          explanation: "Tenant owes remaining year balance immediately.",
          recommendation: "Negotiate removal.",
        },
      ],
      deadlines: [],
    };

    render(
      <AnalyzerView
        data={mockData}
        isLoading={false}
        language="en"
        onRunAnalyze={jest.fn()}
        canRun={true}
      />,
    );

    expect(screen.getByText("Acceleration Clause")).toBeInTheDocument();
    expect(screen.getAllByText("High Severity").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Entire rent becomes due immediately/i)).toBeInTheDocument();
  });

  it("renders AskView with question input and suggested questions", () => {
    render(
      <AskView
        documentText="Sample contract"
        language="en"
        canRun={true}
      />,
    );

    expect(screen.getByPlaceholderText(/Ask something about the document/i)).toBeInTheDocument();
    expect(screen.getByText(/Suggested Questions:/i)).toBeInTheDocument();
  });
});
