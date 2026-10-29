import { ProxyAgent, fetch as undiciFetch } from "undici";
import { filterListings } from "./match";
import { parseAvitoPayload } from "./parse";
import type { Listing, ProfileCheck, SearchProfile } from "./types";
import { buildSearchUrls, isAvitoHttps } from "./url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function proxyOrThrow(raw: string): string | undefined {
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
  return value;
}

async function fetchPage(url: string, proxy?: string): Promise<{ body: string; status: number }> {
  if (!isAvitoHttps(url)) throw new Error("bad-url");
  const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
  const response = await undiciFetch(url, {
    dispatcher,
    redirect: "follow",
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "accept-language": "ru-RU,ru;q=0.9,en;q=0.5",
      "cache-control": "no-cache",
      "upgrade-insecure-requests": "1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  return { body: body.slice(0, 2_000_000), status: response.status };
}

function proxyFailed(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /proxy|tunnel|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|407|socket/i.test(text);
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

  let proxy: string | undefined;
  try {
    proxy = proxyOrThrow(profile.proxyUrl);
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
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      const page = await fetchPage(built.urls[i], proxy);
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
