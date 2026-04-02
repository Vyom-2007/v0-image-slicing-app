"use client"

import { useState } from "react"
import { Header } from "@/components/app/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Youtube, Instagram, PlaySquare, Image as ImageIcon } from "lucide-react"

export default function GalleryPage() {
    return (
        <>
            <Header 
                title="Gallery" 
                subtitle="Browse your downloaded content categorized by platform" 
            />
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <Tabs defaultValue="youtube" className="w-full">
                    <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger 
                            value="youtube" 
                            className="gap-2.5 px-6 py-2.5 data-[state=active]:bg-[#FF0000]/10 data-[state=active]:text-[#FF0000] transition-all rounded-lg"
                        >
                            <Youtube className="h-5 w-5" />
                            <span className="font-semibold tracking-wide">YouTube</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="instagram" 
                            className="gap-2.5 px-6 py-2.5 data-[state=active]:bg-[#C13584]/10 data-[state=active]:text-[#C13584] transition-all rounded-lg"
                        >
                            <Instagram className="h-5 w-5" />
                            <span className="font-semibold tracking-wide">Instagram</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="youtube" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 hover:border-[#FF0000]/30 transition-colors">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FF0000]/10 mb-6 shadow-inner">
                                <PlaySquare className="h-10 w-10 text-[#FF0000]" />
                            </div>
                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-2">
                                YouTube Collection
                            </h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                All your YouTube video downloads and related content will seamlessly appear right here in a stunning layout.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="instagram" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 hover:border-[#C13584]/30 transition-colors">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px] mb-6 shadow-inner">
                                <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-[#C13584]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-2">
                                Instagram Gallery
                            </h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Manage and view all your saved Instagram posts, stories, and reels in one beautiful place.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    )
}
