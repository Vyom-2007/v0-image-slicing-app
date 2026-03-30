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

    const browser = await chromium.launch({
        headless: false, // REQUIRED — TikTok detects headless mode
        args: [
            "--start-minimized",
            "--no-first-run",
            "--disable-blink-features=AutomationControlled",
        ],
    })

    const context = await browser.newContext({
        userAgent: cookieSession.userAgent,
        viewport: { width: 1280, height: 720 },
        // Match real system locale/timezone
        locale: "en-US",
        timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    // Load saved cookies
    await context.addCookies(cookieSession.cookies as Parameters<typeof context.addCookies>[0])
    const page = await context.newPage()

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
                await browser.close()
                return { success: false, error: "CAPTCHA not solved within 5 minutes. Upload cancelled." }
            }
        }

        // Find upload input (hidden file input)
        await page.waitForSelector("input[type='file']", { timeout: 15000 })
        const fileInput = page.locator("input[type='file']").first()
        await fileInput.setInputFiles(path.resolve(options.filepath))
        await stepDelay()

        // Wait for video to process
        await page.waitForSelector("[class*='upload-progress']", { timeout: 60000 }).catch(() => { })
        await page.waitForSelector("[class*='caption']", { timeout: 90000 })
        await stepDelay()

        // Build caption with hashtags
        const hashtags = (options.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
        const fullCaption = `${options.caption} ${hashtags}`.trim()

        // Type caption like a human
        const captionInput = page.locator("[class*='caption']").first()
        await captionInput.click()
        await actionDelay()
        await humanType((char) => page.keyboard.type(char), fullCaption)
        await actionDelay()

        // Post the video
        const postButton = page.locator("button:has-text('Post')").first()
        await postButton.click()

        // Wait for success indicator
        await page.waitForURL(/tiktok\.com\/@/, { timeout: 30000 })

        await browser.close()
        return { success: true }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)

        // Check if session is expired
        if (errorMsg.includes("login") || errorMsg.includes("LoginRequired")) {
            markSessionExpired(accountId, "tiktok")
        }

        await browser.close()
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

    const chromium = await getPlaywright()
    const browser = await chromium.launch({ headless: false, args: ["--start-minimized"] })
    const context = await browser.newContext({ userAgent: cookieSession.userAgent })
    await context.addCookies(cookieSession.cookies as Parameters<typeof context.addCookies>[0])
    const page = await context.newPage()

    try {
        await page.goto("https://www.tiktok.com/", { waitUntil: "domcontentloaded", timeout: 20000 })
        await stepDelay()
        const url = page.url()
        const isLoggedIn = !url.includes("login") && !url.includes("passport")

        // Capture fresh cookies after navigation (extends session)
        const freshCookies = await context.cookies()
        await browser.close()

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
        await browser.close()
        return { valid: false }
    }
}
