import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBox } from "./SearchBox";

describe("SearchBox", () => {
  it("submits the typed company name", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} loading={false} initial="" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Boeing" } });
    fireEvent.click(screen.getByRole("button", { name: /generate receipt/i }));
    expect(onSearch).toHaveBeenCalledWith("Boeing");
  });

  it("disables the button while loading", () => {
    render(<SearchBox onSearch={() => {}} loading initial="" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows suggestions as you type", () => {
    render(<SearchBox onSearch={() => {}} loading={false} initial="" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "lockh" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lockheed Martin" })).toBeInTheDocument();
  });

  it("selecting a suggestion searches the canonical name", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} loading={false} initial="" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "raytheon" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: "RTX" }));
    expect(onSearch).toHaveBeenCalledWith("RTX");
  });

  it("keyboard: ArrowDown + Enter selects the active suggestion", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} loading={false} initial="" />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "lockh" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.submit(input.closest("form")!);
    expect(onSearch).toHaveBeenCalledWith("Lockheed Martin");
  });

  it("does not pop the dropdown for a programmatic initial value", () => {
    render(<SearchBox onSearch={() => {}} loading={false} initial="Lockheed Martin" />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
