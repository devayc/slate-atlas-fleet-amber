import { create } from "zustand";
import { persist } from "zustand/middleware";
import { blankProfile, DEFAULT_PROFILE } from "./fields";
import type { FeedEntry, LogEntry, SearchProfile, StatusLine } from "./types";

const SEEN_CAP = 1500;
const FEED_CAP = 40;
const LOG_CAP = 60;

type WatchState = {
  profiles: SearchProfile[];
  activeId: string;
  token: string;
  chatId: string;
  telegramProxy: string;
  intervalMin: number;
  duty: boolean;
  primed: boolean;
  seenIds: string[];
  feed: FeedEntry[];
  log: LogEntry[];
  status: StatusLine | null;
  patchProfile: (id: string, patch: Partial<SearchProfile>) => void;
  setActive: (id: string) => void;
  addProfile: () => void;
  removeProfile: (id: string) => void;
  setTelegram: (patch: { token?: string; chatId?: string; telegramProxy?: string }) => void;
  setIntervalMin: (minutes: number) => void;
  setDuty: (duty: boolean) => void;
  setPrimed: (primed: boolean) => void;
  remember: (ids: string[]) => void;
  resetMemory: () => void;
  pushFeed: (entries: FeedEntry[]) => void;
  pushLog: (entry: Omit<LogEntry, "id">) => void;
  setStatus: (status: StatusLine | null) => void;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useWatch = create<WatchState>()(
  persist(
    (set, get) => ({
      profiles: [DEFAULT_PROFILE],
      activeId: DEFAULT_PROFILE.id,
      token: "",
      chatId: "",
      telegramProxy: "",
      intervalMin: 5,
      duty: false,
      primed: false,
      seenIds: [],
      feed: [],
      log: [],
      status: null,
      patchProfile: (id, patch) =>
        set({
          profiles: get().profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
        }),
      setActive: (id) => set({ activeId: id }),
      addProfile: () => {
        if (get().profiles.length >= 5) return;
        const profile = blankProfile();
        set({ profiles: [...get().profiles, profile], activeId: profile.id });
      },
      removeProfile: (id) => {
        const profiles = get().profiles.filter((profile) => profile.id !== id);
        if (profiles.length === 0) return;
        set({
          profiles,
          activeId: get().activeId === id ? profiles[0].id : get().activeId,
        });
      },
      setTelegram: (patch) => set(patch),
      setIntervalMin: (intervalMin) => set({ intervalMin }),
      setDuty: (duty) => set({ duty }),
      setPrimed: (primed) => set({ primed }),
      remember: (ids) => {
        const merged = [...ids, ...get().seenIds];
        const unique: string[] = [];
        const have = new Set<string>();
        for (const id of merged) {
          if (have.has(id)) continue;
          have.add(id);
          unique.push(id);
          if (unique.length >= SEEN_CAP) break;
        }
        set({ seenIds: unique });
      },
      resetMemory: () => set({ seenIds: [], primed: false, feed: [] }),
      pushFeed: (entries) => set({ feed: [...entries, ...get().feed].slice(0, FEED_CAP) }),
      pushLog: (entry) => set({ log: [{ ...entry, id: uid() }, ...get().log].slice(0, LOG_CAP) }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: "storozh-watch-v1",
      partialize: (state) => ({
        profiles: state.profiles,
        activeId: state.activeId,
        token: state.token,
        chatId: state.chatId,
        telegramProxy: state.telegramProxy,
        intervalMin: state.intervalMin,
        duty: state.duty,
        primed: state.primed,
        seenIds: state.seenIds,
        feed: state.feed,
        log: state.log,
        status: state.status,
      }),
    },
  ),
);
