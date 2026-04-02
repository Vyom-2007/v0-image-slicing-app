import {
    LayoutDashboard,
    Users,
    FolderOpen,
    CalendarDays,
    BarChart3,
    Download,
    Settings,
    Youtube,
    Music2,
    Instagram,
    Twitter,
    Images,
    type LucideIcon,
} from "lucide-react"

// ─── Platform Definitions ───────────────────────────────────────────

export type PlatformKey = "youtube" | "tiktok" | "instagram" | "x"

export interface PlatformConfig {
    label: string
    color: string
    icon: LucideIcon
    urlPatterns: string[]
}

export const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
    youtube: {
        label: "YouTube",
        color: "#FF0000",
        icon: Youtube,
        urlPatterns: ["youtube.com", "youtu.be"],
    },
    tiktok: {
        label: "TikTok",
        color: "#FF0050",
        icon: Music2,
        urlPatterns: ["tiktok.com"],
    },
    instagram: {
        label: "Instagram",
        color: "#C13584",
        icon: Instagram,
        urlPatterns: ["instagram.com"],
    },
    x: {
        label: "X",
        color: "#1DA1F2",
        icon: Twitter,
        urlPatterns: ["x.com", "twitter.com"],
    },
} as const

// ─── Sidebar Navigation ─────────────────────────────────────────────

export interface NavItem {
    icon: LucideIcon
    label: string
    href: string
    matchExact?: boolean
}

export const NAV_ITEMS: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/", matchExact: true },
    { icon: Users, label: "Accounts", href: "/accounts" },
    { icon: FolderOpen, label: "Library", href: "/library" },
    { icon: Images, label: "Gallery", href: "/gallery" },
    { icon: CalendarDays, label: "Calendar", href: "/calendar" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Download, label: "Downloads", href: "/downloads" },
    { icon: Settings, label: "Settings", href: "/settings" },
]

// ─── File / Download Config ──────────────────────────────────────────

export const ACCEPTED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
    "video/quicktime",
]

export const ACCEPTED_VIDEO_EXTENSIONS = [
    ".mp4",
    ".webm",
    ".mkv",
    ".avi",
    ".mov",
]

export const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export const QUALITY_OPTIONS = [
    { value: "best", label: "Best Available" },
    { value: "1080", label: "1080p" },
    { value: "720", label: "720p" },
    { value: "480", label: "480p" },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────

export function detectPlatform(url: string): PlatformKey | null {
    const lower = url.toLowerCase()
    for (const [key, config] of Object.entries(PLATFORMS)) {
        if (config.urlPatterns.some((p) => lower.includes(p))) {
            return key as PlatformKey
        }
    }
    return null
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    return `${m}:${s.toString().padStart(2, "0")}`
}
