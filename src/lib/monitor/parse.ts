import type { Listing } from "./types";

const MAX_NODES = 25000;
const MAX_DEPTH = 14;

function decodeBasic(value: string): string {
  return value
    .replace(/"/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function priceOf(obj: Record<string, unknown>): number | null {
  const detailed = asRecord(obj.priceDetailed);
  if (detailed && typeof detailed.value === "number") return detailed.value;
  const price = obj.price;
  if (typeof price === "number") return price;
  const priceObj = asRecord(price);
  if (priceObj) {
    if (typeof priceObj.value === "number") return priceObj.value;
    const nested = asRecord(priceObj.current);
    if (nested && typeof nested.value === "number") return nested.value;
  }
  const iva = asRecord(obj.iva);
  const steps = iva?.PriceStep;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const rec = asRecord(step);
      const component = asRecord(rec?.componentData);
      if (component?.component === "price") {
        const payload = asRecord(rec?.payload);
        const pd = asRecord(payload?.priceDetailed);
        if (typeof pd?.value === "number") return pd.value;
      }
    }
  }
  return null;
}

function stringFields(obj: Record<string, unknown>, keys: Set<string>, depth = 0): string[] {
  if (depth > 5) return [];
  const acc: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && keys.has(key)) acc.push(value);
    else if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          const rec = asRecord(item);
          if (rec) acc.push(...stringFields(rec, keys, depth + 1));
        }
      } else {
        acc.push(...stringFields(value as Record<string, unknown>, keys, depth + 1));
      }
    }
  }
  return acc;
}

function roomsFromText(text: string): string | null {
  if (/студ/i.test(text)) return "студия";
  const match = text.match(/(?:^|[^\d])(\d+)\s*-\s*к(?:\.|\s|омн|$)/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (n >= 5) return "5";
  if (n >= 1) return String(n);
  return null;
}

function areaFromText(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i);
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function districtFromText(text: string): string | null {
  const named = text.match(/р-н\.?\s+([A-Za-zА-Яа-яЁё-]+)/i);
  if (named) return named[1];
  const tail = text.match(/([A-Za-zА-Яа-яЁё-]{4,})\s+район/i);
  if (tail) return tail[1];
  return null;
}

function districtOf(obj: Record<string, unknown>, text: string): string | null {
  const keys = new Set(["districtName", "district", "District"]);
  const found = stringFields(obj, keys).map((s) => s.trim()).find(Boolean);
  if (found && !/^иваново$/i.test(found)) return found.replace(/^р-н\.?\s+/i, "");
  return districtFromText(text);
}

function absoluteUrl(path: string, id: string): string {
  if (path.startsWith("http")) return path.split("?")[0];
  if (path.startsWith("/")) return `https://www.avito.ru${path.split("?")[0]}`;
  return `https://www.avito.ru/${id}`;
}

function listingFromRecord(obj: Record<string, unknown>): Listing | null {
  const idRaw = obj.id;
  const id = typeof idRaw === "number" || typeof idRaw === "string" ? String(idRaw) : "";
  if (!/^\d{5,}$/.test(id)) return null;

  const pathCandidate = [obj.urlPath, obj.uri_mweb, obj.uriMweb].find((v) => typeof v === "string") as
    | string
    | undefined;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const price = priceOf(obj);
  if (!pathCandidate && !title && price == null) return null;

  const addressBits = stringFields(
    obj,
    new Set(["locationName", "address", "formattedAddress", "geoReference"]),
  );
  const address = addressBits.filter(Boolean).slice(0, 3).join(", ") || null;
  const blob = [title, address ?? ""].join(" ");
  const rooms = roomsFromText(title) ?? roomsFromText(blob);
  const area = areaFromText(title) ?? areaFromText(blob);

  return {
    id,
    title: title || "Квартира",
    url: absoluteUrl(pathCandidate ?? `/${id}`, id),
    price,
    rooms,
    area,
    district: districtOf(obj, blob),
    address,
  };
}

function walk(value: unknown, out: Listing[], state: { nodes: number }, depth: number) {
  if (state.nodes > MAX_NODES || depth > MAX_DEPTH || value == null) return;
  state.nodes += 1;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out, state, depth + 1);
    return;
  }
  const rec = asRecord(value);
  if (!rec) return;
  const listing = listingFromRecord(rec);
  if (listing && (listing.url.includes("/kvartiry/") || listing.url.includes("/item/") || listing.title)) {
    if (listing.url.includes("/kvartiry/") || listing.price != null) out.push(listing);
  }
  for (const child of Object.values(rec)) walk(child, out, state, depth + 1);
}

export function isBlockedBody(body: string, status: number): boolean {
  const slice = body.slice(0, 4000).toLowerCase();
  if (slice.includes("доступ ограничен") || slice.includes("проблема с ip")) return true;
  if (slice.includes("firewallcaptcha") || slice.includes("captcha")) return true;
  if ((status === 401 || status === 403 || status === 429 || status === 439) && body.length < 80_000) {
    return true;
  }
  return false;
}

function parseDom(html: string): Listing[] {
  const parts = html.split('data-item-id="').slice(1, 60);
  const out: Listing[] = [];
  for (const part of parts) {
    const id = part.match(/^(\d+)/)?.[1];
    if (!id) continue;
    const chunk = part.slice(0, 5000);
    const href =
      chunk.match(/href="(\/[^"]*kvartiry[^"]*)"/i)?.[1] ??
      chunk.match(/itemprop="url"[^>]*href="([^"]+)"/i)?.[1] ??
      chunk.match(/href="(\/[^"]+)"/)?.[1];
    const titleRaw =
      chunk.match(/itemprop="name"[^>]*>([^<]+)/i)?.[1] ??
      chunk.match(/data-marker="item-title"[^>]*>([^<]+)/i)?.[1] ??
      "";
    const title = decodeBasic(titleRaw);
    const priceRaw =
      chunk.match(/itemprop="price"[^>]*content="(\d+)"/i)?.[1] ??
      chunk.match(/content="(\d+)"[^>]*itemprop="price"/i)?.[1];
    const price = priceRaw ? numberFrom(priceRaw) : null;
    const addressRaw = chunk.match(/data-marker="item-address"[^>]*>([^<]+)/i)?.[1] ?? "";
    const address = decodeBasic(addressRaw) || null;
    const blob = `${title} ${address ?? ""}`;
    if (!href && !title) continue;
    out.push({
      id,
      title: title || "Квартира",
      url: absoluteUrl(href ?? `/${id}`, id),
      price,
      rooms: roomsFromText(blob),
      area: areaFromText(blob),
      district: districtFromText(blob),
      address,
    });
  }
  return out;
}

function dedupe(listings: Listing[]): Listing[] {
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const listing of listings) {
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    if (!listing.url.startsWith("https://www.avito.ru/")) continue;
    out.push(listing);
  }
  return out;
}

export function parseAvitoPayload(
  body: string,
  status: number,
): { listings: Listing[]; blocked: boolean; catalog: boolean } {
  if (isBlockedBody(body, status)) return { listings: [], blocked: true, catalog: false };

  const catalog =
    body.includes("data-item-id=") ||
    body.includes('"urlPath"') ||
    body.includes('"catalog"');

  const collected: Listing[] = [];
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      walk(JSON.parse(trimmed), collected, { nodes: 0 }, 0);
    } catch {
      /* not json */
    }
  }

  const re = /<script[^>]*data-mfe-state[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    try {
      walk(JSON.parse(match[1]), collected, { nodes: 0 }, 0);
    } catch {
      /* ignore broken script */
    }
  }

  if (collected.length === 0) collected.push(...parseDom(body));
  const listings = dedupe(collected);
  const blocked = listings.length === 0 && !catalog;
  return { listings, blocked, catalog: catalog || listings.length > 0 };
}
