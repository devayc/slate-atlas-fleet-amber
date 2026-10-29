import type { Listing, SearchProfile } from "./types";

export function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(price)} ₽`;
}

export function formatRooms(rooms: string | null): string {
  if (!rooms) return "—";
  if (rooms === "студия" || rooms === "studio") return "студия";
  return rooms;
}

export function formatArea(area: number | null): string {
  if (area == null) return "—";
  const text = Number.isInteger(area) ? String(area) : String(area).replace(".", ",");
  return `${text} м²`;
}

export function formatListingMessage(listing: Listing, profile?: Pick<SearchProfile, "deal">): string {
  const headline =
    profile?.deal === "rent" ? "Появилась квартира в аренду" : "Появилась новая квартира";
  return [
    headline,
    "",
    `Ссылка: ${listing.url}`,
    `Количество комнат: ${formatRooms(listing.rooms)}`,
    `Площадь: ${formatArea(listing.area)}`,
    `Район: ${listing.district ?? "—"}`,
    `Цена: ${formatPrice(listing.price)}`,
  ].join("\n");
}

export function formatMoneyInput(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 12);
  if (!clean) return "";
  return new Intl.NumberFormat("ru-RU").format(Number(clean));
}
