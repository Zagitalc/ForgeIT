import type { AppSection } from "@/components/uiTypes";

const ITEMS: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: "converter", label: "Converter", icon: "⇆" },
  { id: "queue", label: "Queue", icon: "☰" },
  { id: "history", label: "History", icon: "↺" },
  { id: "settings", label: "Settings", icon: "⚙" }
];

type BottomNavProps = {
  active: AppSection;
  onChange: (section: AppSection) => void;
};

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav md:hidden" aria-label="Primary navigation">
      {ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
