import { ThemeToggle } from "@/components/ThemeToggle";

type TopBarProps = {
  title: string;
  subtitle: string;
  libreOfficeAvailable: boolean;
  showInfo: boolean;
  onToggleInfo: () => void;
};

export function TopBar({ title, subtitle, libreOfficeAvailable, showInfo, onToggleInfo }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand" aria-label="ForgeIT brand">
        <span className="brand-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <h1 className="brand-title">{title}</h1>
          <p className="brand-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <span className={`health-pill ${libreOfficeAvailable ? "health-pill-ready" : "health-pill-missing"}`}>
          LibreOffice {libreOfficeAvailable ? "Ready" : "Missing"}
        </span>
        <button
          type="button"
          onClick={onToggleInfo}
          className="icon-btn"
          aria-label="Offline scope and dependency info"
          aria-expanded={showInfo}
        >
          i
        </button>
        <ThemeToggle />
      </div>

      {showInfo && (
        <div className="topbar-tooltip" role="tooltip">
          UI shell can load from cache. New conversions require local server runtime and dependencies.
        </div>
      )}
    </header>
  );
}
