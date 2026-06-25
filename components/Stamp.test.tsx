import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "./Stamp";

describe("Stamp", () => {
  it("shows the percent and FEDERALLY FED label", () => {
    render(<Stamp percentLabel="36.8%" />);
    expect(screen.getByText("36.8%")).toBeInTheDocument();
    expect(screen.getByText("FEDERALLY FED")).toBeInTheDocument();
  });
  it("renders nothing when no percent (private company)", () => {
    const { container } = render(<Stamp percentLabel="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
