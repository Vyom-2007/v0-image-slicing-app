"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/app/header"
import { PLATFORMS, type PlatformKey, formatBytes, formatDuration } from "@/lib/constants"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FileVideo, Trash2, Grid3X3, List, Download, Upload } from "lucide-react"

interface MediaItem {
    id: string
    title: string
    filename: string
    source: "download" | "upload"
    platform: PlatformKey | null
    duration: number | null
    filesize: number | null
    created_at: string
}

export default function LibraryPage() {
    const [items, setItems] = useState<MediaItem[]>([])
    const [source, setSource] = useState("all")
    const [platformFilter, setPlatformFilter] = useState("all")
    const [view, setView] = useState<"grid" | "list">("grid")
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    function loadMedia() {
        let url = `/api/media?source=${source}&limit=20&page=${page}`
        if (platformFilter !== "all") url += `&platform=${platformFilter}`
        fetch(url)
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || [])
                setTotal(d.total || 0)
                setTotalPages(d.totalPages || 1)
            })
            .catch(console.error)
    }

    useEffect(() => { setPage(1) }, [source, platformFilter])
    useEffect(() => { loadMedia() }, [source, platformFilter, page])

    async function handleDelete(id: string) {
        await fetch(`/api/media?id=${id}`, { method: "DELETE" })
        loadMedia()
    }

    return (
        <>
            <Header title="Media Library" subtitle={`${total} items`} actions={
                <div className="flex items-center gap-1">
                    <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("grid")}>
                        <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("list")}>
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            } />
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-3">
                    <Tabs value={source} onValueChange={setSource}>
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="download" className="gap-1.5"><Download className="h-3 w-3" /> Downloads</TabsTrigger>
                            <TabsTrigger value="upload" className="gap-1.5"><Upload className="h-3 w-3" /> Uploads</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All platforms</SelectItem>
                            {Object.entries(PLATFORMS).map(([key, p]) => (
                                <SelectItem key={key} value={key}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Media Grid */}
                {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-12 text-center">
                        <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No media yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Download or upload videos from the dashboard</p>
                    </div>
                ) : view === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map((item) => {
                            const platform = item.platform ? PLATFORMS[item.platform] : null
                            return (
                                <div key={item.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
                                    <div className="aspect-video bg-muted relative flex items-center justify-center">
                                        <FileVideo className="h-10 w-10 text-muted-foreground" />
                                        {item.duration && (
                                            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">
                                                {formatDuration(item.duration)}
                                            </span>
                                        )}
                                        {platform && (
                                            <span className="absolute top-1.5 left-1.5" style={{ color: platform.color }}>
                                                <platform.icon className="h-4 w-4" />
                                            </span>
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                            <span className={`px-1 py-0.5 rounded ${item.source === "download" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                                                {item.source === "download" ? "↓" : "↑"} {item.source}
                                            </span>
                                            {item.filesize && <span>{formatBytes(item.filesize)}</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                        {items.map((item) => {
                            const platform = item.platform ? PLATFORMS[item.platform] : null
                            return (
                                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <FileVideo className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                            {platform && <span style={{ color: platform.color }}>{platform.label}</span>}
                                            <span>{item.source}</span>
                                            {item.filesize && <span>{formatBytes(item.filesize)}</span>}
                                            {item.duration && <span>{formatDuration(item.duration)}</span>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="outline">Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)} variant="outline">Next</Button>
                    </div>
                )}
            </div>
        </>
    )
}
