export type Deal = "sale" | "rent";

export type RoomCode = "studio" | "1" | "2" | "3" | "4" | "5";

/** One saved search. Add a field here, in `fields.ts`, and in `match.ts`. */
export type SearchProfile = {
  id: string;
  name: string;
  enabled: boolean;
  deal: Deal;
  city: string;
  rooms: RoomCode[];
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  districts: string;
  excludeWords: string;
  customUrl: string;
  proxyUrl: string;
};

export type Listing = {
  id: string;
  title: string;
  url: string;
  price: number | null;
  rooms: string | null;
  area: number | null;
  district: string | null;
  address: string | null;
};

export type ProfileCheck =
  | {
      profileId: string;
      name: string;
      ok: true;
      listings: Listing[];
      urls: string[];
      blockedCount: number;
    }
  | {
      profileId: string;
      name: string;
      ok: false;
      error: "blocked" | "network" | "bad-proxy" | "bad-url" | "empty";
      message: string;
      urls: string[];
    };

export type CheckResponse = {
  checkedAt: string;
  results: ProfileCheck[];
};

export type FeedEntry = Listing & {
  foundAt: string;
  profileName: string;
  sample?: boolean;
};

export type LogEntry = {
  id: string;
  at: string;
  tone: "ok" | "warn" | "err";
  text: string;
};

export type StatusLine = {
  at: string;
  tone: "ok" | "warn" | "err";
  text: string;
};
