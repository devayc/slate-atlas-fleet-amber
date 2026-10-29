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
    const digits = value.replace(/[^\d.,]/g, "").replace(",", ".");
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

function areaOf(obj: Record<string, unknown>): number | null {
  // Common Avito JSON keys for area
  for (const key of ["totalArea", "area", "square", "livingArea", "space"]) {
    const v = obj[key];
    if (typeof v === "number" && v > 5 && v < 500) return v;
    if (typeof v === "string") {
      const n = numberFrom(v);
      if (n != null && n > 5 && n < 500) return n;
    }
    const rec = asRecord(v);
    if (rec) {
      if (typeof rec.value === "number" && rec.value > 5 && rec.value < 500) return rec.value;
      if (typeof rec.amount === "number" && rec.amount > 5 && rec.amount < 500) return rec.amount;
    }
  }
  // nested params / parameters arrays
  for (const key of ["params", "parameters", "itemParams", "attributes"]) {
    const arr = obj[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const rec = asRecord(item);
      if (!rec) continue;
      const title = String(rec.title ?? rec.name ?? rec.label ?? "").toLowerCase();
      if (/площад|area|м²|кв/i.test(title)) {
        const n = numberFrom(rec.value ?? rec.description ?? rec.text);
        if (n != null && n > 5 && n < 500) return n;
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
  if (!text) return null;
  if (/студ/i.test(text)) return "студия";
  const match =
    text.match(/(?:^|[^\d])(\d+)\s*[-–]?\s*к(?:\.|\s|омн|омнат|$)/i) ??
    text.match(/(?:^|[^\d])(\d+)\s*комн/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (n >= 5) return "5";
  if (n >= 1) return String(n);
  return null;
}

function roomsFromUrl(url: string): string | null {
  if (/studii|studio|студи/i.test(url)) return "студия";
  const m = url.match(/(\d)-komnatn/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 5) return "5";
    if (n >= 1) return String(n);
  }
  return null;
}

function areaFromText(text: string): number | null {
  if (!text) return null;
  // "45 м²", "45,5 м2", "45 кв. м", "площадь 45"
  const match =
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i) ??
    text.match(/площад[ьи]\s*[:\s]*(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  if (!Number.isFinite(n) || n < 8 || n > 400) return null;
  return n;
}

function districtFromText(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /р-?н\.?\s+([А-Яа-яЁёA-Za-z-]{3,40})/i,
    /([А-Яа-яЁёA-Za-z-]{3,40})\s+р-?н\b/i,
    /([А-Яа-яЁёA-Za-z-]{3,40})\s+район/i,
    /район\s+([А-Яа-яЁёA-Za-z-]{3,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1] && !/^(г|гор|город|ул|улица|пр|проспект)$/i.test(m[1])) {
      return m[1];
    }
  }
  return null;
}

function districtOf(obj: Record<string, unknown>, text: string): string | null {
  const keys = new Set([
    "districtName",
    "district",
    "District",
    "regionName",
    "parentName",
    "geoName",
  ]);
  const found = stringFields(obj, keys)
    .map((s) => s.trim())
    .find((s) => s && !/^иваново$/i.test(s) && s.length > 2);
  if (found) return found.replace(/^р-?н\.?\s+/i, "");

  // geo object
  const geo = asRecord(obj.geo) ?? asRecord(obj.location) ?? asRecord(obj.address);
  if (geo) {
    for (const key of ["districtName", "district", "name", "parentName"]) {
      const v = geo[key];
      if (typeof v === "string" && v.trim() && !/^иваново$/i.test(v)) {
        return v.trim().replace(/^р-?н\.?\s+/i, "");
      }
    }
  }

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

  const pathCandidate = [obj.urlPath, obj.uri_mweb, obj.uriMweb, obj.url].find(
    (v) => typeof v === "string",
  ) as string | undefined;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const price = priceOf(obj);
  if (!pathCandidate && !title && price == null) return null;

  const addressBits = stringFields(
    obj,
    new Set(["locationName", "address", "formattedAddress", "geoReference", "fullAddress"]),
  );
  const address = addressBits.filter(Boolean).slice(0, 3).join(", ") || null;
  const url = absoluteUrl(pathCandidate ?? `/${id}`, id);
  const blob = [title, address ?? "", url].join(" ");
  const rooms =
    roomsFromText(title) ?? roomsFromText(blob) ?? roomsFromUrl(url);
  const area = areaOf(obj) ?? areaFromText(title) ?? areaFromText(blob);

  return {
    id,
    title: title || "Квартира",
    url,
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
    if (listing.url.includes("/kvartiry/") || listing.price != null || listing.title !== "Квартира") {
      out.push(listing);
    }
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
  const out: Listing[] = [];

  const itemRe = /data-item-id=["'](\d+)["'][^>]*>([\s\S]*?)(?=data-item-id=["']\d+["']|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html)) && out.length < 60) {
    const id = m[1];
    const chunk = m[2].slice(0, 8000);

    const href =
      chunk.match(/href=["'](\/[^"']*kvartiry[^"']*)["']/i)?.[1] ??
      chunk.match(/itemprop=["']url["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      chunk.match(/href=["'](\/[^"']+)["']/i)?.[1];

    const titleRaw =
      chunk.match(/itemprop=["']name["'][^>]*>([^<]+)/i)?.[1] ??
      chunk.match(/data-marker=["']item-title["'][^>]*>([^<]+)/i)?.[1] ??
      chunk.match(/class=["'][^"']*title[^"']*["'][^>]*>([^<]{5,120})/i)?.[1] ??
      "";
    const title = decodeBasic(titleRaw);

    const priceRaw =
      chunk.match(/itemprop=["']price["'][^>]*content=["'](\d+)["']/i)?.[1] ??
      chunk.match(/content=["'](\d+)["'][^>]*itemprop=["']price["']/i)?.[1] ??
      chunk.match(/data-marker=["']item-price["'][^>]*>[\s\S]*?(\d[\d\s]{2,})/i)?.[1];
    const price = priceRaw ? numberFrom(priceRaw) : null;

    const addressRaw =
      chunk.match(/data-marker=["']item-address["'][^>]*>[\s\S]*?<span[^>]*>([^<]+)/i)?.[1] ??
      chunk.match(/data-marker=["']item-address["'][^>]*>([^<]+)/i)?.[1] ??
      chunk.match(/itemprop=["']address["'][^>]*>([^<]+)/i)?.[1] ??
      "";
    const address = decodeBasic(addressRaw) || null;

    // specific specific area in card meta
    const areaRaw =
      chunk.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2)/i)?.[1] ??
      chunk.match(/data-marker=["']item-specific-params["'][^>]*>([^<]+)/i)?.[1];

    const url = absoluteUrl(href ?? `/${id}`, id);
    const blob = `${title} ${address ?? ""} ${areaRaw ?? ""} ${url}`;

    if (!href && !title && price == null) continue;

    out.push({
      id,
      title: title || "Квартира",
      url,
      price,
      rooms: roomsFromText(blob) ?? roomsFromUrl(url),
      area: areaFromText(blob) ?? (areaRaw ? numberFrom(areaRaw) : null),
      district: districtFromText(blob),
      address,
    });
  }

  if (out.length === 0) {
    const parts = html.split(/data-item-id=["']/i).slice(1, 60);
    for (const part of parts) {
      const id = part.match(/^(\d+)/)?.[1];
      if (!id) continue;
      const chunk = part.slice(0, 5000);
      const href =
        chunk.match(/href=["'](\/[^"']*kvartiry[^"']*)["']/i)?.[1] ??
        chunk.match(/href=["'](\/[^"']+)["']/i)?.[1];
      const titleRaw =
        chunk.match(/itemprop=["']name["'][^>]*>([^<]+)/i)?.[1] ??
        chunk.match(/data-marker=["']item-title["'][^>]*>([^<]+)/i)?.[1] ??
        "";
      const title = decodeBasic(titleRaw);
      const priceRaw =
        chunk.match(/itemprop=["']price["'][^>]*content=["'](\d+)["']/i)?.[1] ??
        chunk.match(/content=["'](\d+)["'][^>]*itemprop=["']price["']/i)?.[1];
      const price = priceRaw ? numberFrom(priceRaw) : null;
      const addressRaw = chunk.match(/data-marker=["']item-address["'][^>]*>([^<]+)/i)?.[1] ?? "";
      const address = decodeBasic(addressRaw) || null;
      const url = absoluteUrl(href ?? `/${id}`, id);
      const blob = `${title} ${address ?? ""} ${url}`;
      if (!href && !title) continue;
      out.push({
        id,
        title: title || "Квартира",
        url,
        price,
        rooms: roomsFromText(blob) ?? roomsFromUrl(url),
        area: areaFromText(blob),
        district: districtFromText(blob),
        address,
      });
    }
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

  const preloaded = body.match(/window\.__preloadedState__\s*=\s*(\{[\s\S]*?\});/);
  if (preloaded) {
    try {
      walk(JSON.parse(preloaded[1]), collected, { nodes: 0 }, 0);
    } catch {
      /* ignore */
    }
  }

  if (collected.length === 0) collected.push(...parseDom(body));
  const listings = dedupe(collected);
  const blocked = listings.length === 0 && !catalog;
  return { listings, blocked, catalog: catalog || listings.length > 0 };
}
