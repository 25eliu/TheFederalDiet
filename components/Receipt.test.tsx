import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Receipt } from "./Receipt";
import { LOCKHEED_SEED } from "@/lib/seed";

describe("Receipt", () => {
  it("renders the company, hero contract figure, eyebrow and stamp", () => {
    render(<Receipt data={LOCKHEED_SEED} />);
    expect(screen.getByText("Lockheed Martin")).toBeInTheDocument();
    expect(screen.getAllByText("$14.1B").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/On the federal diet/i)).toBeInTheDocument();
    expect(screen.getByText("FEDERALLY FED")).toBeInTheDocument();
    expect(screen.getByText(/FY2025/)).toBeInTheDocument();
    expect(screen.getByText(/figures = obligations/i)).toBeInTheDocument();
  });

  it("hides the stamp for private companies", () => {
    render(<Receipt data={{ ...LOCKHEED_SEED, isPrivate: true, revenue: null, federallyFed: null, perDollar: null }} />);
    expect(screen.queryByText("FEDERALLY FED")).not.toBeInTheDocument();
  });

  it("renders the celebratory no-contracts variant", () => {
    render(<Receipt data={{ ...LOCKHEED_SEED, status: "no-contracts" }} />);
    expect(screen.getByText(/Good news/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't on the federal diet/i)).toBeInTheDocument();
  });
});
