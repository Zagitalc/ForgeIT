import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import React from "react";

import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge accessibility", () => {
  it("has no critical axe violations", async () => {
    const { container } = render(
      <div>
        <StatusBadge status="queued" />
        <StatusBadge status="processing" />
        <StatusBadge status="completed" />
        <StatusBadge status="failed" />
      </div>
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
