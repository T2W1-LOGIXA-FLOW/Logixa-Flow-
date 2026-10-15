import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminPage from "./page";

vi.mock("@/components/AdminDashboard", () => ({
  default: () => <div>Admin Overview Ready</div>,
}));

describe("Admin dashboard page", () => {
  it("renders the admin dashboard shell", () => {
    render(<AdminPage />);

    expect(screen.getByText("Admin Overview Ready")).toBeInTheDocument();
  });
});
