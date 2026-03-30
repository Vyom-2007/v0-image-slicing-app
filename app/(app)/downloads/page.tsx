"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/app/header"
import { PLATFORMS, type PlatformKey, formatBytes } from "@/lib/constants"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { FileVideo, CheckCircle2, XCircle, Clock } from "lucide-react"

interface MediaItem {
    id: string
    title: string
    source: string
    platform: PlatformKey | null
    filesize: number | null
    status: string
    progress: number
    quality: string | null
    created_at: string
    error: string | null
}

export default function DownloadsPage() {
    const [items, setItems] = useState<MediaItem[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        function load() {
            fetch(`/api/media?source=download&limit=20&page=${page}`)
                .then((r) => r.json())
                .then((d) => {
                    setItems(d.items || [])
                    setTotalPages(d.totalPages || 1)
                })
                .catch(console.error)
        }
        load()
        const interval = setInterval(load, 3000) // Poll for active downloads
        return () => clearInterval(interval)
    }, [page])

    const active = items.filter((i) => i.status === "downloading")
    const completed = items.filter((i) => i.status === "completed")
    const failed = items.filter((i) => i.status === "failed")

    return (
        <>
            <Header title="Downloads" subtitle={`${completed.length} completed, ${active.length} active`} />
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Active Downloads */}
                {active.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Downloads</h2>
                        <div className="space-y-2">
                            {active.map((item) => (
                                <div key={item.id} className="rounded-xl border border-primary/30 bg-card p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FileVideo className="h-5 w-5 text-primary animate-pulse" />
                                        <p className="text-sm font-medium flex-1 truncate">{item.title}</p>
                                        <span className="text-xs text-primary">{item.progress}%</span>
                                    </div>
                                    <Progress value={item.progress} className="h-1.5" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Failed */}
                {failed.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-3">Failed</h2>
                        <div className="space-y-2">
                            {failed.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-card p-3">
                                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{item.error}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* History */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Download History</h2>
                    {completed.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center">
                            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No downloads yet</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="text-left p-3">Title</th>
                                    <th className="text-left p-3">Platform</th>
                                    <th className="text-left p-3">Size</th>
                                    <th className="text-left p-3">Date</th>
                                    <th className="text-left p-3">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-border">
                                    {completed.map((item) => {
                                        const platform = item.platform ? PLATFORMS[item.platform] : null
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-medium truncate max-w-[200px]">{item.title}</td>
                                                <td className="p-3">
                                                    {platform ? (
                                                        <span className="flex items-center gap-1.5" style={{ color: platform.color }}>
                                                            <platform.icon className="h-3.5 w-3.5" /> {platform.label}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="p-3 text-muted-foreground">{item.filesize ? formatBytes(item.filesize) : "—"}</td>
                                                <td className="p-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td className="p-3"><span className="inline-flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="h-3 w-3" /> Completed</span></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
                                    <Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="outline" size="sm">Previous</Button>
                                    <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                                    <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)} variant="outline" size="sm">Next</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
