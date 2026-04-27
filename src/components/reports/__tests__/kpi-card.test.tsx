// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../kpi-card";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(
      <KpiCard
        icon={<span data-testid="icon" />}
        label="Fatturato"
        value="€1.234,00"
      />,
    );
    expect(screen.getByText("Fatturato")).toBeTruthy();
    expect(screen.getByText("€1.234,00")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(
      <KpiCard
        icon={<span />}
        label="Clienti"
        value="42"
        subtitle="nel periodo"
      />,
    );
    expect(screen.getByText("nel periodo")).toBeTruthy();
  });

  it("does not render subtitle when omitted", () => {
    render(<KpiCard icon={<span />} label="X" value="0" />);
    expect(screen.queryByText("nel periodo")).toBeNull();
  });

  it("renders positive delta badge", () => {
    render(
      <KpiCard icon={<span />} label="X" value="0" delta={12.5} />,
    );
    expect(screen.getByText("12.5%")).toBeTruthy();
  });

  it("renders negative delta badge", () => {
    render(
      <KpiCard icon={<span />} label="X" value="0" delta={-7.3} />,
    );
    expect(screen.getByText("7.3%")).toBeTruthy();
  });

  it("does not render delta badge when delta is undefined", () => {
    render(<KpiCard icon={<span />} label="X" value="0" />);
    // no % text at all
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("renders the icon slot", () => {
    render(
      <KpiCard
        icon={<span data-testid="my-icon" />}
        label="X"
        value="0"
      />,
    );
    expect(screen.getByTestId("my-icon")).toBeTruthy();
  });
});
