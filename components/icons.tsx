import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function ForgeSparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 4.6 13.86 8.58 18.15 9.25 15.03 12.27 15.78 16.55 12 14.48 8.22 16.55 8.97 12.27 5.85 9.25 10.14 8.58 12 4.6Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function ConvertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M4 8h12m0 0-2.6-2.5M16 8l-2.6 2.5M20 16H8m0 0 2.6-2.5M8 16l2.6 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function QueueIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.2" fill="currentColor" />
      <path
        d="M9 7h10M9 12h10M9 17h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 5.5V9h3.5M6.2 8.2A7 7 0 1 1 5 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M10.75 3.8h2.5l.55 2.07c.35.13.69.28 1 .46l1.88-1.05 1.77 1.77-1.05 1.88c.18.31.34.65.46 1l2.07.55v2.5l-2.07.55c-.12.35-.28.69-.46 1l1.05 1.88-1.77 1.77-1.88-1.05c-.31.18-.65.34-1 .46l-.55 2.07h-2.5l-.55-2.07a6.58 6.58 0 0 1-1-.46L7.35 18.7l-1.77-1.77 1.05-1.88a6.58 6.58 0 0 1-.46-1l-2.07-.55v-2.5l2.07-.55c.12-.35.28-.69.46-1L5.58 7.57 7.35 5.8l1.88 1.05c.31-.18.65-.33 1-.46l.52-2.07Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </IconBase>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6M17.9 17.9l-1.6-1.6M7.7 7.7 6.1 6.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M15.6 3.9a7.8 7.8 0 1 0 4.5 11.9 7 7 0 0 1-4.6 1.6 7.1 7.1 0 0 1-7.1-7.1 7 7 0 0 1 1.6-4.6 7.8 7.8 0 0 0 5.6-1.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.2v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.1" r="1" fill="currentColor" />
    </IconBase>
  );
}
