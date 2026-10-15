import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminSettingsPage from "./page";

describe("Admin settings page", () => {
  it("renders the control panel and default tabs", () => {
    render(<AdminSettingsPage />);

    expect(screen.getByRole("heading", { name: /control panel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /feature flags/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /security/i })).toBeInTheDocument();
  });
});
