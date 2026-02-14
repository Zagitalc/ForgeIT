import { LIMITS } from "@/lib/config/limits";
import { AppError } from "@/lib/errors";
import { processJob } from "@/lib/jobs/processor";
import { scheduleCleanup } from "@/lib/storage/cleanup";
import type { EnqueuedJob } from "@/lib/types/jobs";

export class JobQueue {
  private readonly queue: EnqueuedJob[] = [];
  private active = 0;

  constructor(private readonly concurrency: number) {
    scheduleCleanup().catch(() => {
      // best effort
    });
  }

  enqueue(job: EnqueuedJob): void {
    if (this.queue.length + this.active >= LIMITS.maxQueueSize) {
      throw new AppError("QUEUE_FULL", "Queue is full. Please retry shortly.");
    }

    this.queue.push(job);
    void this.drain();
  }

  stats(): { active: number; queued: number } {
    return { active: this.active, queued: this.queue.length };
  }

  private async drain(): Promise<void> {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) {
        return;
      }

      this.active += 1;
      void processJob(job)
        .catch(() => {
          // error already persisted in metadata
        })
        .finally(() => {
          this.active -= 1;
          void this.drain();
        });
    }
  }
}

export const jobQueue = new JobQueue(LIMITS.maxConcurrentJobs);
