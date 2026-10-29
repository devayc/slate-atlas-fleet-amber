import type { Listing } from "./types";

/** Shape preview only. These are not live Avito ads. */
export const SAMPLE_LISTINGS: Listing[] = [
  {
    id: "sample-leninsky",
    title: "2-к. квартира, 48 м², 4/5 эт.",
    url: "https://www.avito.ru/ivanovo/kvartiry/prodam-ASgBAgICAUSSA8YQ",
    price: 4_850_000,
    rooms: "2",
    area: 48,
    district: "Ленинский",
    address: "Иваново, р-н Ленинский",
  },
  {
    id: "sample-sovetsky",
    title: "3-к. квартира, 64,5 м², 2/9 эт.",
    url: "https://www.avito.ru/ivanovo/kvartiry/prodam-ASgBAgICAUSSA8YQ",
    price: 5_600_000,
    rooms: "3",
    area: 64.5,
    district: "Советский",
    address: "Иваново, р-н Советский",
  },
];
