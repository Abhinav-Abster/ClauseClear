import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Header } from "@/components/Header";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DocumentInput } from "@/components/DocumentInput";
import { SimplifierView } from "@/components/SimplifierView";
import { AnalyzerView } from "@/components/AnalyzerView";

expect.extend(toHaveNoViolations);

describe("Accessibility (WCAG 2.1 AA Compliance)", () => {
  it("verifies Header component has no accessibility violations", async () => {
    const { container } = render(
      <Header
        language="en"
        onLanguageChange={jest.fn()}
        highContrast={false}
        onToggleHighContrast={jest.fn()}
        textSize="normal"
        onChangeTextSize={jest.fn()}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("verifies DisclaimerBanner has no accessibility violations", async () => {
    const { container } = render(<DisclaimerBanner language="en" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("verifies DocumentInput has no accessibility violations", async () => {
    const { container } = render(
      <DocumentInput
        documentText="Valid legal contract content for testing."
        onDocumentChange={jest.fn()}
        language="en"
        onLoadSample={jest.fn()}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("verifies SimplifierView with data has no accessibility violations", async () => {
    const mockData = {
      summary: "Overview summary of agreement.",
      documentType: "Residential Lease Agreement",
      sections: [
        {
          heading: "1. Term",
          originalSnippet: "Lease term is 12 months.",
          plainLanguageSummary: "The lease lasts one year.",
          keyTakeaway: "One year commitment.",
        },
      ],
      glossary: [
        {
          term: "Escrow",
          definition: "A secure third-party holding account.",
          contextInDoc: "Deposit in escrow.",
        },
      ],
    };

    const { container } = render(
      <SimplifierView
        data={mockData}
        isLoading={false}
        language="en"
        onRunSimplify={jest.fn()}
        canRun={true}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("verifies AnalyzerView with data has no accessibility violations", async () => {
    const mockData = {
      overallRiskLevel: "medium" as const,
      executiveSummary: "Moderate risk level agreement.",
      clauses: [
        {
          title: "Late Payment Fee",
          type: "obligation" as const,
          severity: "medium" as const,
          exactQuote: "Late fee of $50 assessed after the 5th.",
          explanation: "Tenant pays fee if rent is not paid by the 5th.",
          recommendation: "Pay on or before the 1st.",
        },
      ],
      deadlines: [
        {
          title: "Rent Due Date",
          timeframe: "1st of each month",
          triggerEvent: "Monthly cycle",
          consequenceOfMissing: "Late fee after grace period",
          exactQuote: "Due on the first (1st) day of each calendar month.",
        },
      ],
    };

    const { container } = render(
      <AnalyzerView
        data={mockData}
        isLoading={false}
        language="en"
        onRunAnalyze={jest.fn()}
        canRun={true}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
