'use client';
/**
 * Must Company Brand-Aligned Icon Library
 *
 * All icons are SVG-based, respecting the Must Company corporate identity:
 *   Black  #1a1a1a  │  Charcoal  #2d2d2d  │  Brand Green  #1b6c3a
 *
 * Each icon accepts `size` (default 18) and `color` (default currentColor).
 * The MustLogo component reproduces the three-bar trademark mark.
 */

import React from 'react';

interface IconProps {
    size?: number;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
}

// ─── Brand Logo ────────────────────────────────────────────────────────────
/** Three-bar Must Company trademark — matches icon.svg exactly */
export function MustLogo({ size = 24, className, style }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-label="Must Company"
        >
            {/* Left bar */}
            <rect x="2" y="4" width="5" height="16" fill="#171717" />
            {/* Middle bar */}
            <rect x="9" y="4" width="5" height="16" fill="#171717" />
            {/* Right bar — brand green */}
            <rect x="16" y="4" width="5" height="16" fill="#0b8e36" />
        </svg>
    );
}

/** Dark-mode inverse — white + gray bars with green accent */
export function MustLogoDark({ size = 24, className, style }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-label="Must Company"
        >
            <rect x="2" y="4" width="5" height="16" fill="#ffffff" />
            <rect x="9" y="4" width="5" height="16" fill="#a8a8a8" />
            <rect x="16" y="4" width="5" height="16" fill="#0b8e36" />
        </svg>
    );
}

// ─── Generic wrapper ────────────────────────────────────────────────────────
function Icon({ size = 18, color = 'currentColor', className, style, children }: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
        >
            {children}
        </svg>
    );
}

// ─── Navigation Icons ────────────────────────────────────────────────────────

/** Dashboard / Overview */
export function IconDashboard(props: IconProps) {
    return (
        <Icon {...props}>
            {/* Three vertical bars — nod to the brand mark */}
            <rect x="3" y="8" width="4" height="13" rx="1" strokeWidth="0" fill={props.color ?? 'currentColor'} />
            <rect x="10" y="5" width="4" height="16" rx="1" strokeWidth="0" fill={props.color ?? 'currentColor'} opacity={0.7} />
            <rect x="17" y="11" width="4" height="10" rx="1" strokeWidth="0" fill={props.color ?? 'currentColor'} opacity={0.45} />
        </Icon>
    );
}

/** Teams */
export function IconTeams(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="9" cy="7" r="3" />
            <circle cx="17" cy="7" r="3" />
            <path d="M1 21v-2a7 7 0 0 1 11-5.74" />
            <path d="M17 11a7 7 0 0 1 7 7v2H10.5" />
        </Icon>
    );
}

/** Users */
export function IconUsers(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </Icon>
    );
}

/** Workspaces / Integrations */
export function IconWorkspaces(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="6" cy="6" r="2" />
            <circle cx="18" cy="18" r="2" />
            <circle cx="18" cy="6" r="2" />
            <path d="M6 8v8" />
            <path d="M8 6h8" />
            <path d="M8 18h8" />
        </Icon>
    );
}

/** LLM / AI Models */
export function IconAI(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z" />
            <circle cx="9" cy="12" r="1" fill={props.color ?? 'currentColor'} strokeWidth="0" />
            <circle cx="15" cy="12" r="1" fill={props.color ?? 'currentColor'} strokeWidth="0" />
            <path d="M9.5 16a3 3 0 0 0 5 0" />
        </Icon>
    );
}

/** Token Usage */
export function IconTokens(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v6l4 2" />
            <path d="M9 3.5A9 9 0 0 1 21 12" strokeDasharray="2 2" />
        </Icon>
    );
}

/** Audit Log */
export function IconAudit(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="12" y2="17" />
        </Icon>
    );
}

/** Knowledge Base */
export function IconKnowledge(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="9" y1="7" x2="15" y2="7" />
            <line x1="9" y1="11" x2="15" y2="11" />
        </Icon>
    );
}

/** Settings */
export function IconSettings(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Icon>
    );
}

// ─── Utility Icons ───────────────────────────────────────────────────────────

export function IconUpload(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </Icon>
    );
}

export function IconCheck(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="20 6 9 17 4 12" />
        </Icon>
    );
}

export function IconX(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </Icon>
    );
}

export function IconEdit(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Icon>
    );
}

export function IconTrash(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </Icon>
    );
}

export function IconCopy(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </Icon>
    );
}

export function IconMail(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </Icon>
    );
}

export function IconEye(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </Icon>
    );
}

export function IconEyeOff(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </Icon>
    );
}

export function IconChevronDown(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="6 9 12 15 18 9" />
        </Icon>
    );
}

export function IconChevronLeft(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="15 18 9 12 15 6" />
        </Icon>
    );
}

export function IconChevronRight(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="9 18 15 12 9 6" />
        </Icon>
    );
}

export function IconPlus(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </Icon>
    );
}

export function IconChat(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </Icon>
    );
}

export function IconRefresh(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </Icon>
    );
}

export function IconSearch(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Icon>
    );
}

export function IconLogout(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </Icon>
    );
}

export function IconSlack(props: IconProps) {
    return (
        <Icon {...props} >
            <path d="M14.5 10a2.5 2.5 0 0 1-2.5-2.5V3a2.5 2.5 0 0 1 5 0v4.5a2.5 2.5 0 0 1-2.5 2.5z" />
            <path d="M10 14.5a2.5 2.5 0 0 1-2.5 2.5H3a2.5 2.5 0 0 1 0-5h4.5A2.5 2.5 0 0 1 10 14.5z" />
            <path d="M9.5 10a2.5 2.5 0 0 1 2.5 2.5V21a2.5 2.5 0 0 1-5 0v-8.5A2.5 2.5 0 0 1 9.5 10z" />
            <path d="M14 9.5a2.5 2.5 0 0 1 2.5-2.5H21a2.5 2.5 0 0 1 0 5h-4.5A2.5 2.5 0 0 1 14 9.5z" />
        </Icon>
    );
}

export function IconGitHub(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </Icon>
    );
}

export function IconJira(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M11.53 2a.5.5 0 0 0-.35.85L14.29 6H3.5A1.5 1.5 0 0 0 2 7.5v.5a1.5 1.5 0 0 0 1.5 1.5h10.79l-3.11 3.15A.5.5 0 0 0 11.53 14h.94a.5.5 0 0 0 .35-.15l5-5a.5.5 0 0 0 0-.7l-5-6a.5.5 0 0 0-.35-.15h-.94z" />
            <path d="M12.47 22a.5.5 0 0 0 .35-.85L9.71 18H20.5A1.5 1.5 0 0 0 22 16.5v-.5A1.5 1.5 0 0 0 20.5 14H9.71l3.11-3.15A.5.5 0 0 0 12.47 10h-.94a.5.5 0 0 0-.35.15l-5 5a.5.5 0 0 0 0 .7l5 6a.5.5 0 0 0 .35.15h.94z" />
        </Icon>
    );
}

export function IconDollar(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </Icon>
    );
}

export function IconZap(props: IconProps) {
    return (
        <Icon {...props}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </Icon>
    );
}

export function IconSparkles(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        </Icon>
    );
}

export function IconAlertTriangle(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </Icon>
    );
}

export function IconBuilding(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="9" y1="22" x2="9" y2="22" />
            <line x1="15" y1="22" x2="15" y2="22" />
            <line x1="8" y1="6" x2="8" y2="6" />
            <line x1="12" y1="6" x2="12" y2="6" />
            <line x1="16" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="8" y2="10" />
            <line x1="12" y1="10" x2="12" y2="10" />
            <line x1="16" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="8" y2="14" />
            <line x1="12" y1="14" x2="12" y2="14" />
            <line x1="16" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="8" y2="18" />
            <line x1="12" y1="18" x2="12" y2="18" />
            <line x1="16" y1="18" x2="16" y2="18" />
        </Icon>
    );
}

export function IconBrain(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.97-2.02 2.5 2.5 0 0 1-1.07-4.42 2.5 2.5 0 0 1 .5-4.5 2.5 2.5 0 0 1 4.5-2.5V2.5A2.5 2.5 0 0 1 9.5 2z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.97-2.02 2.5 2.5 0 0 0 1.07-4.42 2.5 2.5 0 0 0-.5-4.5 2.5 2.5 0 0 0-4.5-2.5V2.5A2.5 2.5 0 0 0 14.5 2z" />
        </Icon>
    );
}

export function IconLock(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Icon>
    );
}

export function IconChevronUp(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M18 15l-6-6-6 6" />
        </Icon>
    );
}

export function IconSend(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </Icon>
    );
}

export function IconPaperclip(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </Icon>
    );
}

// ─── Map section names to icon components ────────────────────────────────────
export function IconInfo(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}

export const NAV_ICONS: Record<string, React.ComponentType<IconProps>> = {
    overview: IconDashboard,
    teams: IconTeams,
    users: IconUsers,
    workspaces: IconWorkspaces,
    llm: IconAI,
    tokens: IconTokens,
    audit: IconAudit,
    knowledge: IconKnowledge,
    settings: IconSettings,
    profile: IconUsers,
    docs: IconKnowledge,
};
