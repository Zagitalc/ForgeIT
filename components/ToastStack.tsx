import type { ToastMessage } from "@/components/uiTypes";

type ToastStackProps = {
  toasts: ToastMessage[];
};

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`toast ${
            toast.kind === "success" ? "toast-success" : toast.kind === "error" ? "toast-error" : "toast-info"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
