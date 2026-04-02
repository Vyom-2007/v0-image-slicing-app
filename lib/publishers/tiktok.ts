// ─── TikTok Publisher — Stealth Browser via Playwright ───────────────────────
// Uses playwright-extra + puppeteer-extra-plugin-stealth to bypass TikTok's bot detection.
// Loads real browser cookie sessions — requires 1-time manual login.
// ⚠️ Runs in HEADFUL mode (visible window, minimized) — required for TikTok.

import path from "path"
import {
    loadCookies,
    markCaptchaNeeded,
    markSessionExpired,
    saveCookieSession,
} from "@/lib/session-manager"
import { stepDelay, actionDelay, humanType } from "@/lib/human-delay"

// Bypass Next.js webpack bundling which breaks CJS plugin utilities
let stealthApplied = false
async function getPlaywright() {
    // Dynamic eval bypasses the bundler completely
    const req = typeof eval !== "undefined" ? eval("require") : require
    const { chromium } = req("playwright-extra")
    const StealthPlugin = req("puppeteer-extra-plugin-stealth")
    
    if (!stealthApplied) {
        chromium.use(StealthPlugin())
        stealthApplied = true
    }
    return chromium
}

const TIKTOK_UPLOAD_URL = "https://www.tiktok.com/upload?lang=en"

/** Check if a CAPTCHA is visible on the current page */
async function isCaptchaVisible(page: any): Promise<boolean> {
    const selectors = [".captcha-container", "#captcha_container", "[data-e2e='captcha']", ".secsdk-captcha-drag-icon"]
    for (const sel of selectors) {
        try {
            const el = page.locator(sel)
            if (await el.isVisible({ timeout: 1000 })) return true
        } catch { /* not found */ }
    }
    return false
}

/** Wait up to 5 minutes for user to solve CAPTCHA manually */
async function waitForCaptchaSolve(page: any): Promise<boolean> {
    const maxWait = 5 * 60 * 1000 // 5 minutes
    const pollInterval = 3000
    const deadline = Date.now() + maxWait
    while (Date.now() < deadline) {
        if (!(await isCaptchaVisible(page))) return true
        await new Promise((r) => setTimeout(r, pollInterval))
    }
    return false
}

/**
 * Sanitize cookies from Cookie-Editor extension for Playwright compatibility.
 */
function sanitizeCookies(rawCookies: any[]): any[] {
    return rawCookies.map((cookie: any) => {
        const { hostOnly, session, storeId, ...valid } = cookie
        if (typeof valid.sameSite === "string") {
            const ss = valid.sameSite.toLowerCase()
            if (ss === "no_restriction" || ss === "none") valid.sameSite = "None"
            else if (ss === "strict") valid.sameSite = "Strict"
            else valid.sameSite = "Lax"
        } else {
            valid.sameSite = "Lax"
        }
        return valid
    })
}

/**
 * Upload a video to TikTok using stealth browser automation.
 * Sends a push notification if CAPTCHA is encountered.
 */
export async function uploadToTikTok(
    accountId: string,
    options: {
        filepath: string
        caption: string
        hashtags?: string[]
    }
): Promise<{ success: boolean; error?: string }> {
    const cookieSession = loadCookies(accountId, "tiktok")
    if (!cookieSession) {
        return { success: false, error: "No TikTok session. Please connect your account first." }
    }

    const chromium = await getPlaywright()

    const fs = require("fs")
    const sessionDir = path.join(process.cwd(), "cookie-sessions", `tiktok_${accountId}`)
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

    // Use a PERSISTENT context so TikTok Local Storage, Cache, and IndexedDB is fully retained!
    const context = await chromium.launchPersistentContext(sessionDir, {
        headless: false, // REQUIRED — TikTok detects headless mode
        userAgent: cookieSession.userAgent,
        viewport: { width: 1280, height: 720 },
        locale: "en-US",
        timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        args: [
            "--start-minimized",
            "--no-first-run",
            "--disable-blink-features=AutomationControlled",
        ],
    })

    // Persistent context auto-opens one blank page
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage()

    // Inject cookies as backup (persistent context mostly handles this naturally)
    const sanitizedCookies = sanitizeCookies(cookieSession.cookies as any[])
    if (sanitizedCookies.length > 0) {
        await context.addCookies(sanitizedCookies as Parameters<typeof context.addCookies>[0]).catch(() => {})
    }

    try {
        // Navigate to TikTok upload page
        await page.goto(TIKTOK_UPLOAD_URL, { waitUntil: "domcontentloaded", timeout: 30000 })
        await stepDelay()

        // Check for CAPTCHA immediately after navigation
        if (await isCaptchaVisible(page)) {
            markCaptchaNeeded(accountId, "tiktok")
            console.log("[TikTok] CAPTCHA detected — pausing for user to solve...")
            const solved = await waitForCaptchaSolve(page)
            if (!solved) {
                await context.close()
                return { success: false, error: "CAPTCHA not solved within 5 minutes. Upload cancelled." }
            }
        }

        // Give up to 3 minutes — if login screen appears, user can manually scan QR code!
        let isFileInputReady = false
        const loginMaxWait = Date.now() + 180000 // 3 minutes
        
        console.log("[TikTok] Waiting up to 3 mins for login or file input...")
        while (Date.now() < loginMaxWait) {
            const count = await page.locator("input[type='file']").count().catch(() => 0)
            if (count > 0) {
                isFileInputReady = true
                break
            }
            
            const currentUrl = page.url()
            // If the user logged in and TikTok dropped them on the main feed instead of the upload page:
            if (!currentUrl.includes("upload") && !currentUrl.includes("login") && !currentUrl.includes("passport")) {
                console.log("[TikTok] Redirected away from upload. Forcing back to TikTok Studio...")
                await page.goto(TIKTOK_UPLOAD_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {})
                await stepDelay()
            }
            
            await new Promise((r) => setTimeout(r, 2000))
        }

        if (!isFileInputReady) {
            await context.close()
            return { success: false, error: "Timed out waiting for login to complete (3 minutes limit)." }
        }

        // Ensure it's fully attached
        await page.waitForSelector("input[type='file']", { state: "attached", timeout: 15000 })
        
        // Save fresh cookies IMMEDIATELY so we never ask for login again even if the rest fails
        saveCookieSession(accountId, "tiktok", {
            cookies: await context.cookies(),
            userAgent: cookieSession.userAgent,
            platform: "tiktok"
        })

        const fileInput = page.locator("input[type='file']").first()
        await fileInput.setInputFiles(path.resolve(options.filepath))
        await stepDelay()

        // Wait for video to start uploading
        const progressSelector = "[class*='upload-progress'], [class*='uploading-text'], [class*='uploading-stage']"
        await page.waitForSelector(progressSelector, { state: "attached", timeout: 10000 }).catch(() => { })
        
        // Wait up to 3 minutes for the video upload to finish! (The progress indicator must disappear)
        console.log("[TikTok] Video uploading... Waiting for 100% completion...")
        await page.waitForSelector(progressSelector, { state: "hidden", timeout: 180000 })
        
        // Use robust selectors for modern TikTok Studio
        const captionSelector = ".public-DraftEditor-content, [contenteditable='true'], [class*='caption']"
        await page.waitForSelector(captionSelector, { timeout: 90000 })
        await stepDelay()

        // Build caption with hashtags
        const hashtags = (options.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
        const fullCaption = `${options.caption} ${hashtags}`.trim()

        // Type caption like a human
        const captionInput = page.locator(captionSelector).first()
        await captionInput.click()
        await actionDelay()
        await humanType((char) => page.keyboard.type(char), fullCaption)
        await actionDelay()

        // Post the video
        const postButton = page.locator("button:text-is('Post'), button:text-is('Publish'), [data-e2e='post_video_button'], button[class*='post']").locator('visible=true').first()
        await postButton.scrollIntoViewIfNeeded()
        await actionDelay()
        
        // TikTok sometimes sets weird z-index or overlay blockers. Force the click.
        await postButton.click({ force: true })

        console.log("[TikTok] Clicked post. Handling post flow...")

        // Handle possible secondary modals (like the Copyright 'Continue to post' warning)
        let isSuccess = false
        const maxWait = Date.now() + 45000
        const successSelectors = "text='Manage your posts', text='Upload another video', [class*='upload-success']"
        const confirmBtn = page.locator("button:has-text('Continue to post'), button:has-text('Post anyway'), button:has-text('Continue')")

        while (Date.now() < maxWait) {
            // Check for success URL redirect
            if (page.url().includes("tiktok.com/@")) {
                isSuccess = true
                break
            }
            // Check for success Modal
            if (await page.locator(successSelectors).isVisible().catch(() => false)) {
                isSuccess = true
                break
            }

            // If TikTok throws a "Run copyright check?" modal, instantly click "Continue to post"!
            if (await confirmBtn.first().isVisible().catch(() => false)) {
                console.log("[TikTok] Bypassing secondary copyright confirmation modal...")
                await confirmBtn.first().click({ force: true }).catch(() => {})
                await stepDelay()
            }

            await new Promise((r) => setTimeout(r, 1500))
        }

        if (!isSuccess) {
            throw new Error("Failed to confirm publication. TikTok did not show a success message.")
        }

        await context.close()
        return { success: true }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)

        // Check if session is expired
        if (errorMsg.includes("login") || errorMsg.includes("LoginRequired")) {
            markSessionExpired(accountId, "tiktok")
        }

        await context.close()
        return { success: false, error: errorMsg }
    }
}

/**
 * Validate a TikTok session by checking if cookies allow accessing the upload page.
 * Returns the new cookies if valid (to refresh them in DB).
 */
export async function validateTikTokSession(
    accountId: string
): Promise<{ valid: boolean; newCookies?: object[] }> {
    const cookieSession = loadCookies(accountId, "tiktok")
    if (!cookieSession) return { valid: false }

    const fs = require("fs")
    const sessionDir = path.join(process.cwd(), "cookie-sessions", `tiktok_${accountId}`)
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

    const chromium = await getPlaywright()
    const context = await chromium.launchPersistentContext(sessionDir, { 
        headless: false, 
        userAgent: cookieSession.userAgent,
        args: ["--start-minimized", "--disable-blink-features=AutomationControlled"]
    })
    
    // Persistent auto-opens one tab
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage()
    
    const sanitizedCookies = sanitizeCookies(cookieSession.cookies as any[])
    if (sanitizedCookies.length > 0) {
        await context.addCookies(sanitizedCookies as Parameters<typeof context.addCookies>[0]).catch(() => {})
    }

    try {
        await page.goto("https://www.tiktok.com/", { waitUntil: "domcontentloaded", timeout: 20000 })
        await stepDelay()
        const url = page.url()
        const isLoggedIn = !url.includes("login") && !url.includes("passport")

        // Capture fresh cookies after navigation (extends session)
        const freshCookies = await context.cookies()
        await context.close()

        if (isLoggedIn) {
            saveCookieSession(accountId, "tiktok", {
                cookies: freshCookies,
                userAgent: cookieSession.userAgent,
                platform: "tiktok",
            })
            return { valid: true, newCookies: freshCookies }
        }

        markSessionExpired(accountId, "tiktok")
        return { valid: false }
    } catch {
        await context.close()
        return { valid: false }
    }
}
