import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ExternalLink,
  House,
  Plus,
  Radar,
  Send,
  Trash2,
} from "lucide-react";
import { checkSearches, sendTelegram } from "@/lib/monitor/api";
import {
  CITY_OPTIONS,
  DEAL_OPTIONS,
  ROOM_OPTIONS,
  SCALAR_FIELDS,
} from "@/lib/monitor/fields";
import { formatArea, formatListingMessage, formatMoneyInput, formatPrice, formatRooms } from "@/lib/monitor/format";
import { SAMPLE_LISTINGS } from "@/lib/monitor/sample";
import { useWatch } from "@/lib/monitor/store";
import type { FeedEntry, SearchProfile } from "@/lib/monitor/types";
import { buildSearchUrls } from "@/lib/monitor/url";

const INTERVALS = [3, 5, 10, 15, 30];

function sanitize(profile: SearchProfile): SearchProfile {
  const rooms = profile.rooms.filter((room) =>
    ["studio", "1", "2", "3", "4", "5"].includes(room),
  );
  return {
    ...profile,
    name: (profile.name || "Поиск").slice(0, 80),
    city: profile.city.slice(0, 60),
    rooms,
    priceMin: profile.priceMin.replace(/\D/g, "").slice(0, 12),
    priceMax: profile.priceMax.replace(/\D/g, "").slice(0, 12),
    areaMin: profile.areaMin.replace(/\D/g, "").slice(0, 4),
    areaMax: profile.areaMax.replace(/\D/g, "").slice(0, 4),
    districts: profile.districts.slice(0, 200),
    excludeWords: profile.excludeWords.slice(0, 200),
    customUrl: profile.customUrl.slice(0, 2000),
    proxyUrl: profile.proxyUrl.slice(0, 400),
  };
}

function ago(iso: string | null): string {
  if (!iso) return "ещё не проверяли";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WatchApp() {
  const store = useWatch();
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const busy = useRef(false);
  const profile = store.profiles.find((item) => item.id === store.activeId) ?? store.profiles[0];
  const links = profile ? buildSearchUrls(profile) : { urls: [] };

  useEffect(() => {
    const unsub = useWatch.persist.onFinishHydration(() => setHydrated(true));
    if (useWatch.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated || !store.duty) return;
    const wait = window.setTimeout(() => {
      void runCheck("auto");
    }, 1500);
    const timer = window.setInterval(() => {
      void runCheck("auto");
    }, store.intervalMin * 60_000);
    return () => {
      window.clearTimeout(wait);
      window.clearInterval(timer);
    };
  }, [hydrated, store.duty, store.intervalMin]);

  async function runCheck(mode: "manual" | "auto" | "send-current") {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    const pushLog = useWatch.getState().pushLog;
    const setStatus = useWatch.getState().setStatus;
    try {
      const snapshot = useWatch.getState();
      const profiles = snapshot.profiles.map(sanitize);
      const response = await checkSearches({ data: { profiles } });
      if (response.cooldown) {
        if (mode === "manual") {
          setStatus({ at: response.checkedAt, tone: "warn", text: response.message });
        }
        return;
      }

      const seen = new Set(snapshot.seenIds);
      const freshFeed: FeedEntry[] = [];
      const rememberIds: string[] = [];
      const problems: string[] = [];
      let found = 0;
      let sent = 0;
      let hadOk = false;

      for (const result of response.results) {
        if (!result.ok) {
          problems.push(result.message);
          pushLog({ at: response.checkedAt, tone: "err", text: `${result.name}: ${result.message}` });
          continue;
        }
        hadOk = true;
        found += result.listings.length;
        const source = snapshot.profiles.find((item) => item.id === result.profileId);
        const fresh = result.listings.filter((listing) => !seen.has(listing.id));

        const shouldNotify = mode === "send-current" || snapshot.primed;
        const batch = (mode === "send-current" ? result.listings : fresh).slice(0, 8);
        if (!shouldNotify) {
          rememberIds.push(...result.listings.map((listing) => listing.id));
          continue;
        }
        freshFeed.push(
          ...fresh.map((listing) => ({
            ...listing,
            foundAt: response.checkedAt,
            profileName: result.name,
          })),
        );
        if (batch.length === 0) {
          rememberIds.push(...result.listings.map((listing) => listing.id));
          continue;
        }
        if (!snapshot.token || !snapshot.chatId) {
          problems.push("Квартиры нашлись, но Telegram ещё не настроен — сообщение не ушло.");
          continue;
        }
        let failed = false;
        for (const listing of batch) {
          const text = formatListingMessage(listing, source);
          const delivery = await sendTelegram({
            data: { token: snapshot.token, chatId: snapshot.chatId, text },
          });
          if (!delivery.ok) {
            failed = true;
            problems.push(delivery.message);
            pushLog({ at: response.checkedAt, tone: "err", text: delivery.message });
            break;
          }
          sent += 1;
          rememberIds.push(listing.id);
        }
        if (!failed) {
          rememberIds.push(...result.listings.map((listing) => listing.id));
          const extra = (mode === "send-current" ? result.listings.length : fresh.length) - batch.length;
          if (extra > 0) {
            await sendTelegram({
              data: {
                token: snapshot.token,
                chatId: snapshot.chatId,
                text: `И ещё ${extra} объявлений в этой проверке. Откройте сторожа, чтобы посмотреть ленту.`,
              },
            });
          }
        }
      }

      if (rememberIds.length > 0) useWatch.getState().remember(rememberIds);
      if (freshFeed.length > 0) useWatch.getState().pushFeed(freshFeed);

      if (!snapshot.primed && mode !== "send-current" && hadOk) {
        useWatch.getState().setPrimed(true);
        const text = `Запомнил ${found} объявлений. В Telegram пришлю только новые.`;
        setStatus({ at: response.checkedAt, tone: "ok", text });
        pushLog({ at: response.checkedAt, tone: "ok", text });
        return;
      }

      if (sent > 0) {
        const text =
          mode === "send-current"
            ? `Отправил текущие объявления: ${sent}.`
            : `Новых квартир: ${sent}. Сообщения ушли в Telegram.`;
        setStatus({ at: response.checkedAt, tone: "ok", text });
        pushLog({ at: response.checkedAt, tone: "ok", text });
        return;
      }

      if (problems.length > 0 && !hadOk) {
        setStatus({ at: response.checkedAt, tone: "err", text: problems[0] });
        return;
      }

      if (problems.length > 0) {
        setStatus({ at: response.checkedAt, tone: "warn", text: problems[0] });
        return;
      }

      const text = snapshot.primed || mode === "send-current" ? "Новых квартир нет." : "Проверка ничего не вернула.";
      setStatus({ at: response.checkedAt, tone: "ok", text });
      if (mode !== "auto") pushLog({ at: response.checkedAt, tone: "ok", text });
    } catch {
      const at = new Date().toISOString();
      setStatus({
        at,
        tone: "err",
        text: "Проверка сорвалась. Повторите через несколько секунд.",
      });
      pushLog({ at, tone: "err", text: "Проверка сорвалась до ответа Авито." });
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }

  async function sendTest() {
    if (sending) return;
    setSending(true);
    const snapshot = useWatch.getState();
    const text = [
      "Проверка уведомлений",
      "",
      "Так будет выглядеть сообщение о квартире:",
      "",
      formatListingMessage(SAMPLE_LISTINGS[0]),
    ].join("\n");
    try {
      const delivery = await sendTelegram({
        data: { token: snapshot.token, chatId: snapshot.chatId, text },
      });
      const at = new Date().toISOString();
      if (!delivery.ok) {
        snapshot.pushLog({ at, tone: "err", text: delivery.message });
        snapshot.setStatus({ at, tone: "err", text: delivery.message });
      } else {
        const ok = "Тестовое сообщение ушло в Telegram.";
        snapshot.pushLog({ at, tone: "ok", text: ok });
        snapshot.setStatus({ at, tone: "ok", text: ok });
      }
    } catch {
      const at = new Date().toISOString();
      snapshot.setStatus({ at, tone: "err", text: "Не получилось отправить тест в Telegram." });
    } finally {
      setSending(false);
    }
  }

  const feed: FeedEntry[] =
    store.feed.length > 0
      ? store.feed
      : SAMPLE_LISTINGS.map((listing) => ({
          ...listing,
          foundAt: "",
          profileName: "Пример",
          sample: true,
        }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-fg">
              <House className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-serif text-3xl leading-none text-fg">Сторож</h1>
              <p className="mt-1 text-sm text-muted">Новые квартиры с Авито — сразу в Telegram</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm " +
              (store.duty ? "border-ok text-ok" : "border-border text-muted")
            }
          >
            <Radar className="size-4" aria-hidden="true" />
            {store.duty ? `Дежурство · каждые ${store.intervalMin} мин` : "Спит"}
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <section className="order-1 min-w-0 lg:order-2 lg:col-span-7">
          <div
            role="status"
            className={
              "rounded-lg border px-4 py-3 text-sm " +
              (store.status?.tone === "err"
                ? "border-danger text-danger"
                : store.status?.tone === "warn"
                  ? "border-warn text-warn"
                  : "border-border text-fg")
            }
          >
            <p>{store.status?.text ?? "Первая проверка запоминает уже висящие объявления и ничего не шлёт."}</p>
            <p className="mt-1 text-muted">{ago(store.status?.at ?? null)}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50"
              disabled={running}
              onClick={() => void runCheck("manual")}
            >
              <Radar className="size-4" aria-hidden="true" />
              {running ? "Смотрю Авито…" : "Проверить сейчас"}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-fg disabled:opacity-50"
              disabled={running}
              onClick={() => void runCheck("send-current")}
            >
              Прислать то, что уже есть
            </button>
          </div>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl text-fg">Лента</h2>
            <button
              type="button"
              className="min-h-11 text-sm text-muted"
              onClick={() => store.resetMemory()}
            >
              Сбросить память
            </button>
          </div>
          {store.feed.length === 0 && (
            <p className="mt-1 text-sm text-muted">
              Живых объявлений пока нет. Ниже — пример того, как карточка и сообщение выглядят.
            </p>
          )}
          <div className="mt-3 grid gap-3">
            {feed.map((item) => (
              <ListingCard key={item.id + item.foundAt} item={item} />
            ))}
          </div>

          <h2 className="mt-8 font-serif text-2xl text-fg">Журнал</h2>
          {store.log.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Здесь будут проверки и отправки в Telegram.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {store.log.map((entry) => (
                <li key={entry.id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <span className={entry.tone === "err" ? "text-danger" : entry.tone === "warn" ? "text-warn" : "text-ok"}>
                    {entry.text}
                  </span>
                  <span className="mt-1 block text-muted">{ago(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="order-2 grid gap-5 lg:order-1 lg:col-span-5">
          {profile && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-2xl text-fg">Поиски</h2>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-accent disabled:opacity-40"
                  onClick={() => store.addProfile()}
                  disabled={store.profiles.length >= 5}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Ещё поиск
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {store.profiles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => store.setActive(item.id)}
                    className={
                      "min-h-11 shrink-0 rounded-md border px-3 text-sm " +
                      (item.id === profile.id
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border bg-surface-2 text-fg")
                    }
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-sm text-muted" htmlFor="search-name">
                Название
              </label>
              <input
                id="search-name"
                className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
                value={profile.name}
                onChange={(event) => store.patchProfile(profile.id, { name: event.target.value })}
              />

              <div className="mt-4 flex gap-2">
                {DEAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      "min-h-11 flex-1 rounded-md border text-sm " +
                      (profile.deal === option.value
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border bg-surface-2 text-fg")
                    }
                    onClick={() => store.patchProfile(profile.id, { deal: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-sm text-muted" htmlFor="city">
                Город
              </label>
              <input
                id="city"
                list="cities"
                className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
                value={profile.city}
                onChange={(event) => store.patchProfile(profile.id, { city: event.target.value })}
              />
              <datalist id="cities">
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>

              <p className="mt-4 text-sm text-muted">Комнаты</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ROOM_OPTIONS.map((option) => {
                  const on = profile.rooms.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={on}
                      className={
                        "min-h-11 min-w-11 rounded-md border px-3 text-sm " +
                        (on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-fg")
                      }
                      onClick={() => {
                        const rooms = on
                          ? profile.rooms.filter((room) => room !== option.value)
                          : [...profile.rooms, option.value];
                        store.patchProfile(profile.id, { rooms });
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SCALAR_FIELDS.filter((field) => field.group === "money").map((field) => (
                  <Field
                    key={field.key}
                    id={field.key}
                    label={field.label}
                    value={
                      field.kind === "money" ? formatMoneyInput(profile[field.key]) : profile[field.key]
                    }
                    placeholder={field.placeholder}
                    onChange={(value) =>
                      store.patchProfile(profile.id, {
                        [field.key]: field.kind === "text" ? value : value.replace(/\D/g, ""),
                      })
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                Площадь сверяется уже после загрузки объявления. Если в карточке её не оказалось, объявление не выкидываем.
              </p>

              <div className="mt-4">
                <Field
                  id="districts"
                  label="Районы"
                  value={profile.districts}
                  placeholder="Ленинский, Советский"
                  onChange={(value) => store.patchProfile(profile.id, { districts: value })}
                />
                <p className="mt-1.5 text-sm text-muted">Через запятую. Пусто — весь город.</p>
              </div>

              <details className="mt-4 rounded-md border border-border bg-surface-2 px-3 py-2">
                <summary className="min-h-11 cursor-pointer list-none py-2 text-sm text-fg">
                  Дополнительно: слова, своя ссылка, прокси
                </summary>
                <div className="grid gap-3 pb-3">
                  <Field
                    id="exclude"
                    label="Исключить слова"
                    value={profile.excludeWords}
                    placeholder="доля, общежитие"
                    onChange={(value) => store.patchProfile(profile.id, { excludeWords: value })}
                  />
                  <label className="block text-sm text-muted" htmlFor="custom-url">
                    Своя ссылка поиска Авито
                  </label>
                  <textarea
                    id="custom-url"
                    rows={3}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                    placeholder="https://www.avito.ru/ivanovo/kvartiry/..."
                    value={profile.customUrl}
                    onChange={(event) => store.patchProfile(profile.id, { customUrl: event.target.value })}
                  />
                  <p className="text-sm text-muted">
                    Если вставить ссылку, город, комнаты и цена в запросе берутся из неё. Площадь, районы и исключения всё равно применяются здесь.
                  </p>
                  <label className="block text-sm text-muted" htmlFor="proxy">
                    HTTP-прокси, если Авито не пускает
                  </label>
                  <input
                    id="proxy"
                    className="min-h-11 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-accent"
                    placeholder="http://логин:пароль@хост:порт"
                    value={profile.proxyUrl}
                    autoComplete="off"
                    onChange={(event) => store.patchProfile(profile.id, { proxyUrl: event.target.value })}
                  />
                </div>
              </details>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    className="size-4 accent-accent"
                    checked={profile.enabled}
                    onChange={(event) => store.patchProfile(profile.id, { enabled: event.target.checked })}
                  />
                  Участвует в проверке
                </label>
                {store.profiles.length > 1 && (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-danger"
                    onClick={() => store.removeProfile(profile.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Удалить
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-1">
                {links.error ? (
                  <p className="text-sm text-warn">{links.error}</p>
                ) : (
                  links.urls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 w-full min-w-0 items-center gap-2 text-sm text-accent"
                    >
                      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{url.replace("https://www.avito.ru", "avito.ru")}</span>
                    </a>
                  ))
                )}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-accent" aria-hidden="true" />
              <h2 className="font-serif text-2xl text-fg">Telegram</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Создайте бота в @BotFather, нажмите /start в чате с ним и узнайте chat id у @userinfobot.
            </p>
            <label className="mt-4 block text-sm text-muted" htmlFor="token">
              Токен бота
            </label>
            <input
              id="token"
              type="password"
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
              value={store.token}
              onChange={(event) => store.setTelegram({ token: event.target.value.trim() })}
            />
            <label className="mt-3 block text-sm text-muted" htmlFor="chat">
              Chat id
            </label>
            <input
              id="chat"
              className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
              placeholder="например 123456789"
              value={store.chatId}
              onChange={(event) => store.setTelegram({ chatId: event.target.value.trim() })}
            />
            <p className="mt-2 text-sm text-muted">
              Токен остаётся в этом браузере и отправляется только в момент письма. В базу он не пишется.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-muted" htmlFor="interval">
                Интервал дежурства
              </label>
              <select
                id="interval"
                className="min-h-11 rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
                value={store.intervalMin}
                onChange={(event) => store.setIntervalMin(Number(event.target.value))}
              >
                {INTERVALS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    каждые {minutes} мин
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50"
                disabled={sending}
                onClick={() => void sendTest()}
              >
                <Send className="size-4" aria-hidden="true" />
                {sending ? "Отправляю…" : "Тест в Telegram"}
              </button>
              <button
                type="button"
                className={
                  "inline-flex min-h-11 items-center justify-center rounded-md border px-4 " +
                  (store.duty ? "border-ok text-ok" : "border-border bg-surface-2 text-fg")
                }
                onClick={() => store.setDuty(!store.duty)}
              >
                {store.duty ? "Остановить дежурство" : "Включить дежурство"}
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">
              {store.primed
                ? "Память включена: повторно уже виденные квартиры не шлём."
                : "Память пустая: первая удачная проверка только запомнит текущие объявления."}
            </p>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            <h2 className="font-serif text-2xl text-fg">Где держать сторожа</h2>
            <p className="mt-2 text-fg">
              Обычный виртуальный хостинг вроде классического Beget не подойдёт: там нет постоянной проверки, а Авито быстро закрывает такие адреса.
            </p>
            <p className="mt-2">
              Пока эта вкладка открыта, дежурство само ходит на Авито и пишет в Telegram. Вкладку можно свернуть, но не закрывать.
            </p>
            <p className="mt-2">
              Круглосуточно и без браузера надёжнее маленький VPS в России — Beget VPS, Timeweb Cloud или Selectel. Если Авито ответит «проблема с IP», в поиске указывается HTTP-прокси, код для этого менять не нужно.
            </p>
            <p className="mt-2">
              Цена, комнаты, площадь и районы правятся в карточке поиска. Второй город или другие условия — кнопка «Ещё поиск». Любой фильтр самого Авито, которого здесь нет, задаётся своей ссылкой.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-muted" htmlFor={id}>
      {label}
      <input
        id={id}
        inputMode="text"
        className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ListingCard({ item }: { item: FeedEntry }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-2xl text-fg">{formatPrice(item.price)}</p>
        {item.sample ? (
          <span className="rounded-md border border-warn px-2 py-1 text-xs text-warn">пример</span>
        ) : (
          <span className="text-xs text-muted">{item.profileName}</span>
        )}
      </div>
      <h3 className="mt-1 text-base text-fg">{item.title}</h3>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted">Комнаты</dt>
          <dd className="text-fg">{formatRooms(item.rooms)}</dd>
        </div>
        <div>
          <dt className="text-muted">Площадь</dt>
          <dd className="text-fg">{formatArea(item.area)}</dd>
        </div>
        <div>
          <dt className="text-muted">Район</dt>
          <dd className="text-fg">{item.district ?? "—"}</dd>
        </div>
      </dl>
      {item.sample ? (
        <p className="mt-3 text-sm text-muted">Это не объявление, а образец сообщения.</p>
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-accent"
        >
          Открыть на Авито
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
