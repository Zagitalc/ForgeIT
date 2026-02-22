import type { ReactElement, SVGProps } from "react";

import { ConvertIcon, HistoryIcon, QueueIcon, SettingsIcon } from "@/components/icons";
import type { AppSection } from "@/components/uiTypes";

const ITEMS: Array<{
  id: AppSection;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
}> = [
  { id: "converter", label: "Converter", icon: ConvertIcon },
  { id: "queue", label: "Queue", icon: QueueIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon }
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
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true" className="bottom-nav-icon-wrap">
              <Icon className="icon-svg bottom-nav-icon" />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
