import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminPaymentsPage from "./page";

describe("Admin payments page", () => {
  it("shows that payments are unavailable instead of rendering fake transactions", () => {
    render(<AdminPaymentsPage />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Payments are unavailable because a payment-management backend is not configured."
    );
    expect(screen.queryByText("Total Revenue")).not.toBeInTheDocument();
    expect(screen.queryByText(/beta-payment/)).not.toBeInTheDocument();
  });
});
