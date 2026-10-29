import type { Deal, RoomCode, SearchProfile } from "./types";

/**
 * Text and number filters rendered by the form automatically.
 * To add a filter like "мин. этаж":
 * 1. add the key to SearchProfile,
 * 2. push a row here,
 * 3. apply it in match.ts.
 * Rooms and deal are custom controls — they are not in this list.
 */
export type ScalarField = {
  key: "priceMin" | "priceMax" | "areaMin" | "areaMax" | "districts" | "excludeWords";
  label: string;
  kind: "money" | "number" | "text";
  hint?: string;
  placeholder?: string;
  group: "money" | "place" | "extra";
};

export const SCALAR_FIELDS: ScalarField[] = [
  {
    key: "priceMin",
    label: "Цена от, ₽",
    kind: "money",
    placeholder: "не задано",
    group: "money",
  },
  {
    key: "priceMax",
    label: "Цена до, ₽",
    kind: "money",
    placeholder: "6 000 000",
    group: "money",
  },
  {
    key: "areaMin",
    label: "Площадь от, м²",
    kind: "number",
    placeholder: "например 40",
    hint: "Сравниваем с площадью в объявлении. Если площадь не распозналась — объявление не выбрасываем.",
    group: "money",
  },
  {
    key: "areaMax",
    label: "Площадь до, м²",
    kind: "number",
    placeholder: "не задано",
    group: "money",
  },
  {
    key: "districts",
    label: "Районы",
    kind: "text",
    placeholder: "Ленинский, Советский",
    hint: "Через запятую. Пусто — весь город.",
    group: "place",
  },
  {
    key: "excludeWords",
    label: "Исключить слова",
    kind: "text",
    placeholder: "доля, общежитие, комната",
    hint: "Если слово есть в заголовке или адресе — объявление пропускаем.",
    group: "extra",
  },
];

export const ROOM_OPTIONS: { value: RoomCode; label: string }[] = [
  { value: "studio", label: "Студия" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5+" },
];

export const DEAL_OPTIONS: { value: Deal; label: string }[] = [
  { value: "sale", label: "Продажа" },
  { value: "rent", label: "Аренда" },
];

export const CITY_OPTIONS = [
  "Иваново",
  "Шуя",
  "Кинешма",
  "Кострома",
  "Ярославль",
  "Владимир",
  "Москва",
  "Санкт-Петербург",
  "Нижний Новгород",
  "Казань",
];

export const DEFAULT_PROFILE: SearchProfile = {
  id: "p_ivanovo",
  name: "Квартиры Иваново",
  enabled: true,
  deal: "sale",
  city: "Иваново",
  rooms: ["2", "3", "4"],
  priceMin: "",
  priceMax: "6000000",
  areaMin: "",
  areaMax: "",
  districts: "",
  excludeWords: "",
  customUrl: "",
  proxyUrl: "",
};

export function blankProfile(): SearchProfile {
  return {
    ...DEFAULT_PROFILE,
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    name: "Новый поиск",
    enabled: true,
    priceMax: "",
    rooms: ["2", "3"],
  };
}
