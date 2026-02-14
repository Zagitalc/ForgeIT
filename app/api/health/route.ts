import { NextResponse } from "next/server";

import { checkLibreOfficeHealth } from "@/lib/converters/libreofficeHealth";
import { jobQueue } from "@/lib/jobs/queue";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const libreOffice = await checkLibreOfficeHealth();

  return NextResponse.json({
    ok: true,
    data: {
      libreOffice,
      queue: jobQueue.stats(),
      offline: true
    }
  });
}
