import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the main heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: /get started/i }),
    ).toBeInTheDocument();
  });

  it("starts the counter at 0", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /count is 0/i }),
    ).toBeInTheDocument();
  });

  it("increments the counter on click", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /count is/i });
    fireEvent.click(button);
    expect(button).toHaveTextContent("Count is 1");
  });
});
