import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jobs/processor", () => ({
  processJob: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  })
}));

vi.mock("@/lib/storage/cleanup", () => ({
  scheduleCleanup: vi.fn(async () => undefined)
}));

describe("JobQueue", () => {
  it("processes with configured concurrency", async () => {
    const { JobQueue } = await import("@/lib/jobs/queue");

    const queue = new JobQueue(1);
    queue.enqueue({ id: "a", tool: "pdf.merge", files: [], options: {} });
    queue.enqueue({ id: "b", tool: "pdf.merge", files: [], options: {} });

    expect(queue.stats().queued).toBeGreaterThanOrEqual(1);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(queue.stats().active).toBe(0);
    expect(queue.stats().queued).toBe(0);
  });
});
