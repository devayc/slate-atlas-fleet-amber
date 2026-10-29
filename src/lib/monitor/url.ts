import type { Deal, RoomCode, SearchProfile } from "./types";

const CITY_SLUGS: Record<string, string> = {
  иваново: "ivanovo",
  шуя: "shuya",
  кинешма: "kineshma",
  кострома: "kostroma",
  ярославль: "yaroslavl",
  владимир: "vladimir",
  москва: "moskva",
  "санкт-петербург": "sankt-peterburg",
  петербург: "sankt-peterburg",
  спб: "sankt-peterburg",
  "нижний новгород": "nizhniy_novgorod",
  казань: "kazan",
  воронеж: "voronezh",
  краснодар: "krasnodar",
  екатеринбург: "ekaterinburg",
  новосибирск: "novosibirsk",
  самара: "samara",
  ростов: "rostov-na-donu",
  "ростов-на-дону": "rostov-na-donu",
  уфа: "ufa",
  пермь: "perm",
  сочи: "sochi",
  вологда: "vologda",
  рязань: "ryazan",
  тула: "tula",
};

const ROOM_SLUG: Record<RoomCode, string> = {
  studio: "studii",
  "1": "1-komnatnye",
  "2": "2-komnatnye",
  "3": "3-komnatnye",
  "4": "4-komnatnye",
  "5": "5-komnatnye",
};

const DEAL_HASH: Record<Deal, { path: string; hash: string }> = {
  sale: { path: "prodam", hash: "ASgBAgICAUSSA8YQ" },
  rent: { path: "sdam", hash: "ASgBAgICAUSSA8gQ" },
};

export function citySlug(city: string): string | null {
  const key = city.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
  if (!key) return null;
  if (CITY_SLUGS[key]) return CITY_SLUGS[key];
  if (/^[a-z0-9][a-z0-9_-]{1,40}$/.test(key)) return key;
  return null;
}

export function isAvitoHttps(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return (
      url.protocol === "https:" &&
      (url.hostname === "www.avito.ru" || url.hostname === "m.avito.ru" || url.hostname === "avito.ru")
    );
  } catch {
    return false;
  }
}

function queryOf(profile: SearchProfile): string {
  const q = new URLSearchParams();
  if (/^\d+$/.test(profile.priceMin) && profile.priceMin !== "0") q.set("pmin", profile.priceMin);
  if (/^\d+$/.test(profile.priceMax) && profile.priceMax !== "0") q.set("pmax", profile.priceMax);
  q.set("s", "104");
  return q.toString();
}

/** Public Avito search links for a profile. Custom URL replaces the builder. */
export function buildSearchUrls(profile: SearchProfile): { urls: string[]; error?: string } {
  const custom = profile.customUrl.trim();
  if (custom) {
    if (!isAvitoHttps(custom)) {
      return { urls: [], error: "Своя ссылка должна начинаться с https://www.avito.ru/" };
    }
    return { urls: [custom] };
  }

  const slug = citySlug(profile.city);
  if (!slug) {
    return {
      urls: [],
      error: "Не знаю адрес этого города на Авито. Выберите город из списка или вставьте готовую ссылку поиска.",
    };
  }

  const deal = DEAL_HASH[profile.deal];
  const rooms = profile.rooms.length > 0 ? profile.rooms : [null];
  const q = queryOf(profile);
  const urls = rooms.map((room) => {
    const tail = room
      ? `${deal.path}/${ROOM_SLUG[room]}-${deal.hash}`
      : `${deal.path}-${deal.hash}`;
    return `https://www.avito.ru/${slug}/kvartiry/${tail}?${q}`;
  });
  return { urls };
}
