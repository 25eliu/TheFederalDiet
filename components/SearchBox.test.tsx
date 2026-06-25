import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBox } from "./SearchBox";

describe("SearchBox", () => {
  it("submits the typed company name", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} loading={false} initial="" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Boeing" } });
    fireEvent.click(screen.getByRole("button", { name: /generate receipt/i }));
    expect(onSearch).toHaveBeenCalledWith("Boeing");
  });

  it("disables the button while loading", () => {
    render(<SearchBox onSearch={() => {}} loading initial="" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
