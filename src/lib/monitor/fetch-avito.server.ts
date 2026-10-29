import { chromium, type Browser, type BrowserContext } from "playwright";
import { filterListings } from "./match";
import { parseAvitoPayload } from "./parse";
import type { Listing, ProfileCheck, SearchProfile } from "./types";
import { buildSearchUrls, isAvitoHttps } from "./url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type ParsedProxy = {
  server: string;
  username?: string;
  password?: string;
};

function parseProxy(raw: string): ParsedProxy | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("bad-proxy");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad-proxy");
  if (!url.hostname) throw new Error("bad-proxy");

  const server = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
  const username = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  return { server, username, password };
}

async function fetchPageWithBrowser(
  url: string,
  proxy?: ParsedProxy,
): Promise<{ body: string; status: number }> {
  if (!isAvitoHttps(url)) throw new Error("bad-url");

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    context = await browser.newContext({
      userAgent: UA,
      locale: "ru-RU",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
      proxy: proxy
        ? {
            server: proxy.server,
            username: proxy.username,
            password: proxy.password,
          }
        : undefined,
    });

    // Slightly reduce automation signals
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });

    // Give QRATOR / JS a moment if present
    await page.waitForTimeout(1200 + Math.floor(Math.random() * 800));

    const status = response?.status() ?? 0;
    const body = await page.content();

    return { body: body.slice(0, 2_000_000), status };
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

function proxyFailed(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /proxy|tunnel|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|407|socket|ERR_PROXY|net::ERR/i.test(text);
}

export async function runAvitoCheck(profile: SearchProfile): Promise<ProfileCheck> {
  const built = buildSearchUrls(profile);
  if (built.error || built.urls.length === 0) {
    return {
      profileId: profile.id,
      name: profile.name,
      ok: false,
      error: "bad-url",
      message: built.error ?? "Не удалось собрать ссылку поиска.",
      urls: [],
    };
  }

  let proxy: ParsedProxy | undefined;
  try {
    proxy = parseProxy(profile.proxyUrl);
  } catch {
    return {
      profileId: profile.id,
      name: profile.name,
      ok: false,
      error: "bad-proxy",
      message: "Прокси должен быть вида http://логин:пароль@хост:порт",
      urls: built.urls,
    };
  }

  const listings: Listing[] = [];
  let blocked = 0;
  let network = 0;
  let proxyErrors = 0;

  for (let i = 0; i < built.urls.length; i += 1) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
    try {
      const page = await fetchPageWithBrowser(built.urls[i], proxy);
      const parsed = parseAvitoPayload(page.body, page.status);
      if (parsed.blocked) blocked += 1;
      else listings.push(...parsed.listings);
    } catch (error) {
      if (proxy && proxyFailed(error)) proxyErrors += 1;
      else network += 1;
    }
  }

  const filtered = filterListings(listings, profile);
  if (filtered.length === 0 && proxyErrors === built.urls.length) {
    return {
      profileId: profile.id,
      name: profile.name,
      ok: false,
      error: "bad-proxy",
      message: "Не удалось подключиться через прокси. Проверьте адрес, логин и порт.",
      urls: built.urls,
    };
  }
  if (filtered.length === 0 && blocked === built.urls.length) {
    return {
      profileId: profile.id,
      name: profile.name,
      ok: false,
      error: "blocked",
      message:
        "Авито закрыл доступ с этого адреса (ограничение по IP). Укажите HTTP-прокси в дополнительных настройках или запускайте сторожа с российского VPS.",
      urls: built.urls,
    };
  }
  if (filtered.length === 0 && network === built.urls.length) {
    return {
      profileId: profile.id,
      name: profile.name,
      ok: false,
      error: "network",
      message: "Авито не ответил. Повторите проверку чуть позже.",
      urls: built.urls,
    };
  }

  return {
    profileId: profile.id,
    name: profile.name,
    ok: true,
    listings: filtered.slice(0, 40),
    urls: built.urls,
    blockedCount: blocked,
  };
}
