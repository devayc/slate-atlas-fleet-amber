import { n as isAvitoHttps, t as buildSearchUrls } from "./url-D7qHEphZ.mjs";
import { t as require_undici } from "../_libs/undici.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fetch-avito.server-BM11tA2G.js
var import_undici = require_undici();
function digits(value) {
	const clean = value.trim();
	if (!clean) return null;
	if (!/^\d+(\.\d+)?$/.test(clean)) return null;
	const n = Number(clean);
	return Number.isFinite(n) ? n : null;
}
function listWords(value) {
	return value.split(/[,;\n]/).map((part) => part.trim().toLowerCase().replace(/ё/g, "е")).filter(Boolean);
}
function haystack(listing) {
	return [
		listing.title,
		listing.address,
		listing.district
	].filter(Boolean).join(" ").toLowerCase().replace(/ё/g, "е");
}
function districtOk(listing, profile) {
	const wanted = listWords(profile.districts);
	if (wanted.length === 0) return true;
	if (!listing.district && !listing.address) return true;
	const text = haystack(listing);
	return wanted.some((word) => text.includes(word));
}
/**
* Post-filters. URL already narrows city, rooms and price when possible.
* Unknown area / rooms / district are kept — a missed parse must not hide a flat.
*/
function listingMatches(listing, profile) {
	const priceMin = digits(profile.priceMin);
	const priceMax = digits(profile.priceMax);
	if (listing.price != null && priceMin != null && listing.price < priceMin) return false;
	if (listing.price != null && priceMax != null && listing.price > priceMax) return false;
	if (listing.rooms && profile.rooms.length > 0 && !profile.customUrl.trim()) {
		const code = listing.rooms === "студия" ? "studio" : listing.rooms;
		if (!new Set(profile.rooms).has(code)) return false;
	}
	const areaMin = digits(profile.areaMin);
	const areaMax = digits(profile.areaMax);
	if (listing.area != null && areaMin != null && listing.area < areaMin) return false;
	if (listing.area != null && areaMax != null && listing.area > areaMax) return false;
	if (!districtOk(listing, profile)) return false;
	const banned = listWords(profile.excludeWords);
	if (banned.length > 0) {
		const text = haystack(listing);
		if (banned.some((word) => text.includes(word))) return false;
	}
	return true;
}
function filterListings(listings, profile) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const listing of listings) {
		if (seen.has(listing.id)) continue;
		if (!listingMatches(listing, profile)) continue;
		seen.add(listing.id);
		out.push(listing);
	}
	return out;
}
var MAX_NODES = 25e3;
var MAX_DEPTH = 14;
function decodeBasic(value) {
	return value.replace(/"/g, "\"").replace(/&#34;/g, "\"").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function numberFrom(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const digits = value.replace(/[^\d]/g, "");
		if (!digits) return null;
		const n = Number(digits);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}
function priceOf(obj) {
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
	const steps = asRecord(obj.iva)?.PriceStep;
	if (Array.isArray(steps)) for (const step of steps) {
		const rec = asRecord(step);
		if (asRecord(rec?.componentData)?.component === "price") {
			const pd = asRecord(asRecord(rec?.payload)?.priceDetailed);
			if (typeof pd?.value === "number") return pd.value;
		}
	}
	return null;
}
function stringFields(obj, keys, depth = 0) {
	if (depth > 5) return [];
	const acc = [];
	for (const [key, value] of Object.entries(obj)) if (typeof value === "string" && keys.has(key)) acc.push(value);
	else if (value && typeof value === "object") {
		if (Array.isArray(value)) for (const item of value) {
			const rec = asRecord(item);
			if (rec) acc.push(...stringFields(rec, keys, depth + 1));
		}
		else acc.push(...stringFields(value, keys, depth + 1));
	}
	return acc;
}
function roomsFromText(text) {
	if (/студ/i.test(text)) return "студия";
	const match = text.match(/(?:^|[^\d])(\d+)\s*-\s*к(?:\.|\s|омн|$)/i);
	if (!match) return null;
	const n = Number(match[1]);
	if (n >= 5) return "5";
	if (n >= 1) return String(n);
	return null;
}
function areaFromText(text) {
	const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i);
	if (!match) return null;
	const n = Number(match[1].replace(",", "."));
	return Number.isFinite(n) ? n : null;
}
function districtFromText(text) {
	const named = text.match(/р-н\.?\s+([A-Za-zА-Яа-яЁё-]+)/i);
	if (named) return named[1];
	const tail = text.match(/([A-Za-zА-Яа-яЁё-]{4,})\s+район/i);
	if (tail) return tail[1];
	return null;
}
function districtOf(obj, text) {
	const found = stringFields(obj, /* @__PURE__ */ new Set([
		"districtName",
		"district",
		"District"
	])).map((s) => s.trim()).find(Boolean);
	if (found && !/^иваново$/i.test(found)) return found.replace(/^р-н\.?\s+/i, "");
	return districtFromText(text);
}
function absoluteUrl(path, id) {
	if (path.startsWith("http")) return path.split("?")[0];
	if (path.startsWith("/")) return `https://www.avito.ru${path.split("?")[0]}`;
	return `https://www.avito.ru/${id}`;
}
function listingFromRecord(obj) {
	const idRaw = obj.id;
	const id = typeof idRaw === "number" || typeof idRaw === "string" ? String(idRaw) : "";
	if (!/^\d{5,}$/.test(id)) return null;
	const pathCandidate = [
		obj.urlPath,
		obj.uri_mweb,
		obj.uriMweb
	].find((v) => typeof v === "string");
	const title = typeof obj.title === "string" ? obj.title.trim() : "";
	const price = priceOf(obj);
	if (!pathCandidate && !title && price == null) return null;
	const address = stringFields(obj, /* @__PURE__ */ new Set([
		"locationName",
		"address",
		"formattedAddress",
		"geoReference"
	])).filter(Boolean).slice(0, 3).join(", ") || null;
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
		address
	};
}
function walk(value, out, state, depth) {
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
function isBlockedBody(body, status) {
	const slice = body.slice(0, 4e3).toLowerCase();
	if (slice.includes("доступ ограничен") || slice.includes("проблема с ip")) return true;
	if (slice.includes("firewallcaptcha") || slice.includes("captcha")) return true;
	if ((status === 401 || status === 403 || status === 429 || status === 439) && body.length < 8e4) return true;
	return false;
}
function parseDom(html) {
	const parts = html.split("data-item-id=\"").slice(1, 60);
	const out = [];
	for (const part of parts) {
		const id = part.match(/^(\d+)/)?.[1];
		if (!id) continue;
		const chunk = part.slice(0, 5e3);
		const href = chunk.match(/href="(\/[^"]*kvartiry[^"]*)"/i)?.[1] ?? chunk.match(/itemprop="url"[^>]*href="([^"]+)"/i)?.[1] ?? chunk.match(/href="(\/[^"]+)"/)?.[1];
		const title = decodeBasic(chunk.match(/itemprop="name"[^>]*>([^<]+)/i)?.[1] ?? chunk.match(/data-marker="item-title"[^>]*>([^<]+)/i)?.[1] ?? "");
		const priceRaw = chunk.match(/itemprop="price"[^>]*content="(\d+)"/i)?.[1] ?? chunk.match(/content="(\d+)"[^>]*itemprop="price"/i)?.[1];
		const price = priceRaw ? numberFrom(priceRaw) : null;
		const address = decodeBasic(chunk.match(/data-marker="item-address"[^>]*>([^<]+)/i)?.[1] ?? "") || null;
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
			address
		});
	}
	return out;
}
function dedupe(listings) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const listing of listings) {
		if (seen.has(listing.id)) continue;
		seen.add(listing.id);
		if (!listing.url.startsWith("https://www.avito.ru/")) continue;
		out.push(listing);
	}
	return out;
}
function parseAvitoPayload(body, status) {
	if (isBlockedBody(body, status)) return {
		listings: [],
		blocked: true,
		catalog: false
	};
	const catalog = body.includes("data-item-id=") || body.includes("\"urlPath\"") || body.includes("\"catalog\"");
	const collected = [];
	const trimmed = body.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) try {
		walk(JSON.parse(trimmed), collected, { nodes: 0 }, 0);
	} catch {}
	const re = /<script[^>]*data-mfe-state[^>]*>([\s\S]*?)<\/script>/gi;
	let match;
	while (match = re.exec(body)) try {
		walk(JSON.parse(match[1]), collected, { nodes: 0 }, 0);
	} catch {}
	if (collected.length === 0) collected.push(...parseDom(body));
	const listings = dedupe(collected);
	return {
		listings,
		blocked: listings.length === 0 && !catalog,
		catalog: catalog || listings.length > 0
	};
}
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function proxyOrThrow(raw) {
	const value = raw.trim();
	if (!value) return void 0;
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error("bad-proxy");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad-proxy");
	if (!url.hostname) throw new Error("bad-proxy");
	return value;
}
async function fetchPage(url, proxy) {
	if (!isAvitoHttps(url)) throw new Error("bad-url");
	const dispatcher = proxy ? new import_undici.ProxyAgent(proxy) : void 0;
	const response = await (0, import_undici.fetch)(url, {
		dispatcher,
		redirect: "follow",
		headers: {
			"user-agent": UA,
			accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
			"accept-language": "ru-RU,ru;q=0.9,en;q=0.5",
			"cache-control": "no-cache",
			"upgrade-insecure-requests": "1"
		},
		signal: AbortSignal.timeout(2e4)
	});
	return {
		body: (await response.text()).slice(0, 2e6),
		status: response.status
	};
}
function proxyFailed(error) {
	const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
	return /proxy|tunnel|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|407|socket/i.test(text);
}
async function runAvitoCheck(profile) {
	const built = buildSearchUrls(profile);
	if (built.error || built.urls.length === 0) return {
		profileId: profile.id,
		name: profile.name,
		ok: false,
		error: "bad-url",
		message: built.error ?? "Не удалось собрать ссылку поиска.",
		urls: []
	};
	let proxy;
	try {
		proxy = proxyOrThrow(profile.proxyUrl);
	} catch {
		return {
			profileId: profile.id,
			name: profile.name,
			ok: false,
			error: "bad-proxy",
			message: "Прокси должен быть вида http://логин:пароль@хост:порт",
			urls: built.urls
		};
	}
	const listings = [];
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
	if (filtered.length === 0 && proxyErrors === built.urls.length) return {
		profileId: profile.id,
		name: profile.name,
		ok: false,
		error: "bad-proxy",
		message: "Не удалось подключиться через прокси. Проверьте адрес, логин и порт.",
		urls: built.urls
	};
	if (filtered.length === 0 && blocked === built.urls.length) return {
		profileId: profile.id,
		name: profile.name,
		ok: false,
		error: "blocked",
		message: "Авито закрыл доступ с этого адреса (ограничение по IP). Укажите HTTP-прокси в дополнительных настройках или запускайте сторожа с российского VPS.",
		urls: built.urls
	};
	if (filtered.length === 0 && network === built.urls.length) return {
		profileId: profile.id,
		name: profile.name,
		ok: false,
		error: "network",
		message: "Авито не ответил. Повторите проверку чуть позже.",
		urls: built.urls
	};
	return {
		profileId: profile.id,
		name: profile.name,
		ok: true,
		listings: filtered.slice(0, 40),
		urls: built.urls,
		blockedCount: blocked
	};
}
//#endregion
export { runAvitoCheck };
