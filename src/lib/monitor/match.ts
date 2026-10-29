import type { Listing, SearchProfile } from "./types";

function digits(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function listWords(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((part) => part.trim().toLowerCase().replace(/ё/g, "е"))
    .filter(Boolean);
}

function haystack(listing: Listing): string {
  return [listing.title, listing.address, listing.district]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е");
}

function districtOk(listing: Listing, profile: SearchProfile): boolean {
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
export function listingMatches(listing: Listing, profile: SearchProfile): boolean {
  const priceMin = digits(profile.priceMin);
  const priceMax = digits(profile.priceMax);
  if (listing.price != null && priceMin != null && listing.price < priceMin) return false;
  if (listing.price != null && priceMax != null && listing.price > priceMax) return false;

  if (listing.rooms && profile.rooms.length > 0 && !profile.customUrl.trim()) {
    const code = listing.rooms === "студия" ? "studio" : listing.rooms;
    const allowed = new Set<string>(profile.rooms);
    if (!allowed.has(code)) return false;
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

export function filterListings(listings: Listing[], profile: SearchProfile): Listing[] {
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const listing of listings) {
    if (seen.has(listing.id)) continue;
    if (!listingMatches(listing, profile)) continue;
    seen.add(listing.id);
    out.push(listing);
  }
  return out;
}
