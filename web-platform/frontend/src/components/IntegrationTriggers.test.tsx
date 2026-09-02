import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IntegrationTriggers from "./IntegrationTriggers";

describe("integration controls", () => {
  it("keeps email available while explicitly disabling unsupported triggers", () => {
    render(<IntegrationTriggers token="admin-token" />);

    expect(screen.getByRole("button", { name: "Send Test Email" })).toBeEnabled();
    expect(screen.getByText(/PDF export and webhook delivery are unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Generate PDF|Send Webhook/ })).not.toBeInTheDocument();
  });
});
