import { URL } from "node:url";

const REQUEST_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 1024 * 1024; // 1 MB

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { url } = req.body || {};

        if (!url || typeof url !== "string") {
            return res.status(400).json({ error: "Missing URL" });
        }

        const normalizedUrl = normalizeAndValidateUrl(url);

        const html = await fetchHtml(normalizedUrl);
        const preview = extractLinkPreview(html, normalizedUrl);

        return res.status(200).json(preview);
    } catch (err) {
        console.error("Link preview failed:", err);

        return res.status(400).json({
            error: err?.message || "Failed to generate link preview"
        });
    }
}

function normalizeAndValidateUrl(rawUrl) {
    let normalized = String(rawUrl).trim();

    if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }

    let parsed;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new Error("Invalid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP/HTTPS URLs are allowed");
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    isPrivateIpv4(hostname)
    ) {
        throw new Error("Private or local URLs are not allowed");
    }

    return parsed.toString();
}

function isPrivateIpv4(hostname) {
    const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;

    const parts = match.slice(1).map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;

    return false;
}

async function fetchHtml(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; NOESIS-LinkPreview/1.0)",
                "Accept": "text/html,application/xhtml+xml"
            }
        });

        if (!response.ok) {
            throw new Error(`Target page returned ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            throw new Error("URL is not an HTML page");
        }

        const html = await readResponseTextLimited(response, MAX_HTML_BYTES);
        return html;
    } catch (err) {
        if (err?.name === "AbortError") {
            throw new Error("Preview request timed out");
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

async function readResponseTextLimited(response, maxBytes) {
    if (!response.body) {
        return await response.text();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    let result = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            throw new Error("HTML response too large");
        }

        result += decoder.decode(value, { stream: true });
    }

    result += decoder.decode();
    return result;
}

function extractLinkPreview(html, pageUrl) {
    const parsedUrl = new URL(pageUrl);

    const title =
    findMetaContent(html, "property", "og:title") ||
    findMetaContent(html, "name", "twitter:title") ||
    findTitle(html) ||
    parsedUrl.hostname;

    const description =
    findMetaContent(html, "property", "og:description") ||
    findMetaContent(html, "name", "twitter:description") ||
    findMetaContent(html, "name", "description") ||
    "";

    const imageRaw =
    findMetaContent(html, "property", "og:image") ||
    findMetaContent(html, "name", "twitter:image") ||
    "";

    const site =
    findMetaContent(html, "property", "og:site_name") ||
    parsedUrl.hostname.replace(/^www\./i, "");

    const image = imageRaw ? resolveUrl(imageRaw, pageUrl) : null;

    return {
        url: pageUrl,
        title: cleanText(title),
        description: cleanText(description),
        image,
        site: cleanText(site)
    };
}

function findMetaContent(html, attrName, attrValue) {
    const escapedValue = escapeRegex(attrValue);

    const patterns = [
        new RegExp(
            `<meta[^>]+${attrName}\\s*=\\s*["']${escapedValue}["'][^>]+content\\s*=\\s*["']([^"']*)["'][^>]*>`,
            "i"
        ),
        new RegExp(
            `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+${attrName}\\s*=\\s*["']${escapedValue}["'][^>]*>`,
            "i"
        )
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return decodeHtmlEntities(match[1]);
    }

    return "";
}

function findTitle(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function resolveUrl(maybeRelativeUrl, baseUrl) {
    try {
        return new URL(maybeRelativeUrl, baseUrl).toString();
    } catch {
        return null;
    }
}

function cleanText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
}

function decodeHtmlEntities(text) {
    return String(text || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}