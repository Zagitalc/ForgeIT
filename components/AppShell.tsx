import type { ReactNode } from "react";

type AppShellProps = {
  topBar: ReactNode;
  children: ReactNode;
  bottomNav: ReactNode;
};

export function AppShell({ topBar, children, bottomNav }: AppShellProps) {
  return (
    <main className="app-shell">
      {topBar}
      <div className="app-shell-content">{children}</div>
      {bottomNav}
    </main>
  );
}
