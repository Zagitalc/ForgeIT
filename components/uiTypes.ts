import type { ReactNode } from "react";

import type { JobRecord, ToolType } from "@/lib/types/api";

export type AppSection = "converter" | "queue" | "history" | "settings";
export type ToolTab = "Convert" | "PDF" | "Images";

export type ToastMessage = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

export type SectionCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export type ActionButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "neutral";
  type?: "button" | "submit";
};

export type QueueMiniStatProps = {
  label: string;
  value: number;
};

export type HistoryCardProps = {
  job: JobRecord;
  relativeStarted: string;
  parseSummary?: string;
  canDownload: boolean;
  downloadLabel: string;
  onDownload: (job: JobRecord) => void;
  onRerun: (job: JobRecord) => void;
  onReuseSettings: (job: JobRecord) => void;
  onDelete: (job: JobRecord) => void;
};

export type ToolOption = {
  label: string;
  value: ToolType;
  tab: ToolTab;
  accepts: string;
};

export type ConverterFileEntry = {
  key: string;
  file: File;
  parsed: {
    matched: boolean;
    dateMs: number | null;
  };
};
