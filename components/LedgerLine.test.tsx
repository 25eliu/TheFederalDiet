import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LedgerLine } from "./LedgerLine";

describe("LedgerLine", () => {
  it("renders label and value", () => {
    render(<LedgerLine label="Of every $100 of federal spend" value="$3.52" />);
    expect(screen.getByText(/Of every \$100/)).toBeInTheDocument();
    expect(screen.getByText("$3.52")).toBeInTheDocument();
  });
});
