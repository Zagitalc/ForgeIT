import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { Dashboard } from "@/components/Dashboard";

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
    headers: new Headers()
  } as Response;
}

describe("Dashboard UI shell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("/api/health")) {
          return createJsonResponse({
            ok: true,
            data: {
              libreOffice: { available: true, path: "/usr/bin/soffice" },
              qpdf: { available: true, path: "/usr/bin/qpdf", version: "qpdf version 12.3.2" },
              queue: { active: 0, queued: 0 }
            }
          });
        }

        if (url.includes("/api/jobs")) {
          return createJsonResponse({ ok: true, data: { jobs: [], queue: { active: 0, queued: 0 } } });
        }

        return createJsonResponse({ ok: true, data: {} });
      })
    );

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  it("switches active bottom nav section", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const queueNav = screen.getByRole("button", { name: "Queue" });
    await user.click(queueNav);

    expect(queueNav).toHaveAttribute("aria-current", "page");
  });

  it("opens file input when dropzone is clicked", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);

    render(<Dashboard />);
    await user.click(screen.getByTestId("dropzone-trigger"));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("keeps submit disabled until files are selected", () => {
    render(<Dashboard />);
    expect(screen.getByTestId("start-job-btn")).toBeDisabled();
  });

  it("shows filename-date mode controls when selecting smart filename sort", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    expect(screen.queryByText("Mode")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Sort outputs by"), "filename_date");

    expect(screen.getByText("Mode")).toBeInTheDocument();
  });
});
