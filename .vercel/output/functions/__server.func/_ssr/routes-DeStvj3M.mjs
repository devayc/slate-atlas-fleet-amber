import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as array, o as object, r as boolean, s as string, t as _enum } from "../_libs/zod.mjs";
import { t as buildSearchUrls } from "./url-D7qHEphZ.mjs";
import { a as Plus, c as Bell, i as Radar, n as Trash2, o as House, r as Send, s as ExternalLink } from "../_libs/lucide-react.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DeStvj3M.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var room = _enum([
	"studio",
	"1",
	"2",
	"3",
	"4",
	"5"
]);
var profileSchema = object({
	id: string().min(1).max(40),
	name: string().min(1).max(80),
	enabled: boolean(),
	deal: _enum(["sale", "rent"]),
	city: string().max(60),
	rooms: array(room).max(6),
	priceMin: string().regex(/^\d{0,12}$/),
	priceMax: string().regex(/^\d{0,12}$/),
	areaMin: string().regex(/^\d{0,4}$/),
	areaMax: string().regex(/^\d{0,4}$/),
	districts: string().max(200),
	excludeWords: string().max(200),
	customUrl: string().max(2e3),
	proxyUrl: string().max(400)
});
var checkSchema = object({ profiles: array(profileSchema).min(1).max(5) });
var telegramSchema = object({
	token: string().min(8).max(200),
	chatId: string().min(2).max(80),
	text: string().min(1).max(3500)
});
var checkSearches = createServerFn({ method: "POST" }).validator((input) => checkSchema.parse(input)).handler(createSsrRpc("421fa72af96579c30b1195b92c3894f06d6e52474795ada1a5744b0955e0da7f"));
var sendTelegram = createServerFn({ method: "POST" }).validator((input) => telegramSchema.parse(input)).handler(createSsrRpc("d7c633178f75cb57bef7a5ccdae92985b7d5457d2f3eff2fb3921df46eeaf634"));
var SCALAR_FIELDS = [
	{
		key: "priceMin",
		label: "Цена от, ₽",
		kind: "money",
		placeholder: "не задано",
		group: "money"
	},
	{
		key: "priceMax",
		label: "Цена до, ₽",
		kind: "money",
		placeholder: "6 000 000",
		group: "money"
	},
	{
		key: "areaMin",
		label: "Площадь от, м²",
		kind: "number",
		placeholder: "например 40",
		hint: "Сравниваем с площадью в объявлении. Если площадь не распозналась — объявление не выбрасываем.",
		group: "money"
	},
	{
		key: "areaMax",
		label: "Площадь до, м²",
		kind: "number",
		placeholder: "не задано",
		group: "money"
	},
	{
		key: "districts",
		label: "Районы",
		kind: "text",
		placeholder: "Ленинский, Советский",
		hint: "Через запятую. Пусто — весь город.",
		group: "place"
	},
	{
		key: "excludeWords",
		label: "Исключить слова",
		kind: "text",
		placeholder: "доля, общежитие, комната",
		hint: "Если слово есть в заголовке или адресе — объявление пропускаем.",
		group: "extra"
	}
];
var ROOM_OPTIONS = [
	{
		value: "studio",
		label: "Студия"
	},
	{
		value: "1",
		label: "1"
	},
	{
		value: "2",
		label: "2"
	},
	{
		value: "3",
		label: "3"
	},
	{
		value: "4",
		label: "4"
	},
	{
		value: "5",
		label: "5+"
	}
];
var DEAL_OPTIONS = [{
	value: "sale",
	label: "Продажа"
}, {
	value: "rent",
	label: "Аренда"
}];
var CITY_OPTIONS = [
	"Иваново",
	"Шуя",
	"Кинешма",
	"Кострома",
	"Ярославль",
	"Владимир",
	"Москва",
	"Санкт-Петербург",
	"Нижний Новгород",
	"Казань"
];
var DEFAULT_PROFILE = {
	id: "p_ivanovo",
	name: "Квартиры Иваново",
	enabled: true,
	deal: "sale",
	city: "Иваново",
	rooms: [
		"2",
		"3",
		"4"
	],
	priceMin: "",
	priceMax: "6000000",
	areaMin: "",
	areaMax: "",
	districts: "",
	excludeWords: "",
	customUrl: "",
	proxyUrl: ""
};
function blankProfile() {
	return {
		...DEFAULT_PROFILE,
		id: `p_${Math.random().toString(36).slice(2, 8)}`,
		name: "Новый поиск",
		enabled: true,
		priceMax: "",
		rooms: ["2", "3"]
	};
}
function formatPrice(price) {
	if (price == null) return "—";
	return `${new Intl.NumberFormat("ru-RU").format(price)} ₽`;
}
function formatRooms(rooms) {
	if (!rooms) return "—";
	if (rooms === "студия" || rooms === "studio") return "студия";
	return rooms;
}
function formatArea(area) {
	if (area == null) return "—";
	return `${Number.isInteger(area) ? String(area) : String(area).replace(".", ",")} м²`;
}
function formatListingMessage(listing, profile) {
	return [
		profile?.deal === "rent" ? "Появилась квартира в аренду" : "Появилась новая квартира",
		"",
		`Ссылка: ${listing.url}`,
		`Количество комнат: ${formatRooms(listing.rooms)}`,
		`Площадь: ${formatArea(listing.area)}`,
		`Район: ${listing.district ?? "—"}`,
		`Цена: ${formatPrice(listing.price)}`
	].join("\n");
}
function formatMoneyInput(digits) {
	const clean = digits.replace(/\D/g, "").slice(0, 12);
	if (!clean) return "";
	return new Intl.NumberFormat("ru-RU").format(Number(clean));
}
/** Shape preview only. These are not live Avito ads. */
var SAMPLE_LISTINGS = [{
	id: "sample-leninsky",
	title: "2-к. квартира, 48 м², 4/5 эт.",
	url: "https://www.avito.ru/ivanovo/kvartiry/prodam-ASgBAgICAUSSA8YQ",
	price: 485e4,
	rooms: "2",
	area: 48,
	district: "Ленинский",
	address: "Иваново, р-н Ленинский"
}, {
	id: "sample-sovetsky",
	title: "3-к. квартира, 64,5 м², 2/9 эт.",
	url: "https://www.avito.ru/ivanovo/kvartiry/prodam-ASgBAgICAUSSA8YQ",
	price: 56e5,
	rooms: "3",
	area: 64.5,
	district: "Советский",
	address: "Иваново, р-н Советский"
}];
var SEEN_CAP = 1500;
var FEED_CAP = 40;
var LOG_CAP = 60;
function uid() {
	return Math.random().toString(36).slice(2, 10);
}
var useWatch = create()(persist((set, get) => ({
	profiles: [DEFAULT_PROFILE],
	activeId: DEFAULT_PROFILE.id,
	token: "",
	chatId: "",
	intervalMin: 5,
	duty: false,
	primed: false,
	seenIds: [],
	feed: [],
	log: [],
	status: null,
	patchProfile: (id, patch) => set({ profiles: get().profiles.map((profile) => profile.id === id ? {
		...profile,
		...patch
	} : profile) }),
	setActive: (id) => set({ activeId: id }),
	addProfile: () => {
		if (get().profiles.length >= 5) return;
		const profile = blankProfile();
		set({
			profiles: [...get().profiles, profile],
			activeId: profile.id
		});
	},
	removeProfile: (id) => {
		const profiles = get().profiles.filter((profile) => profile.id !== id);
		if (profiles.length === 0) return;
		set({
			profiles,
			activeId: get().activeId === id ? profiles[0].id : get().activeId
		});
	},
	setTelegram: (patch) => set(patch),
	setIntervalMin: (intervalMin) => set({ intervalMin }),
	setDuty: (duty) => set({ duty }),
	setPrimed: (primed) => set({ primed }),
	remember: (ids) => {
		const merged = [...ids, ...get().seenIds];
		const unique = [];
		const have = /* @__PURE__ */ new Set();
		for (const id of merged) {
			if (have.has(id)) continue;
			have.add(id);
			unique.push(id);
			if (unique.length >= SEEN_CAP) break;
		}
		set({ seenIds: unique });
	},
	resetMemory: () => set({
		seenIds: [],
		primed: false,
		feed: []
	}),
	pushFeed: (entries) => set({ feed: [...entries, ...get().feed].slice(0, FEED_CAP) }),
	pushLog: (entry) => set({ log: [{
		...entry,
		id: uid()
	}, ...get().log].slice(0, LOG_CAP) }),
	setStatus: (status) => set({ status })
}), {
	name: "storozh-watch-v1",
	partialize: (state) => ({
		profiles: state.profiles,
		activeId: state.activeId,
		token: state.token,
		chatId: state.chatId,
		intervalMin: state.intervalMin,
		duty: state.duty,
		primed: state.primed,
		seenIds: state.seenIds,
		feed: state.feed,
		log: state.log,
		status: state.status
	})
}));
var INTERVALS = [
	3,
	5,
	10,
	15,
	30
];
function sanitize(profile) {
	const rooms = profile.rooms.filter((room) => [
		"studio",
		"1",
		"2",
		"3",
		"4",
		"5"
	].includes(room));
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
		customUrl: profile.customUrl.slice(0, 2e3),
		proxyUrl: profile.proxyUrl.slice(0, 400)
	};
}
function ago(iso) {
	if (!iso) return "ещё не проверяли";
	const diff = Date.now() - new Date(iso).getTime();
	const minutes = Math.round(diff / 6e4);
	if (minutes < 1) return "только что";
	if (minutes < 60) return `${minutes} мин назад`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} ч назад`;
	return new Date(iso).toLocaleString("ru-RU", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function WatchApp() {
	const store = useWatch();
	const [running, setRunning] = (0, import_react.useState)(false);
	const [sending, setSending] = (0, import_react.useState)(false);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const busy = (0, import_react.useRef)(false);
	const profile = store.profiles.find((item) => item.id === store.activeId) ?? store.profiles[0];
	const links = profile ? buildSearchUrls(profile) : { urls: [] };
	(0, import_react.useEffect)(() => {
		const unsub = useWatch.persist.onFinishHydration(() => setHydrated(true));
		if (useWatch.persist.hasHydrated()) setHydrated(true);
		return unsub;
	}, []);
	(0, import_react.useEffect)(() => {
		if (!hydrated || !store.duty) return;
		const wait = window.setTimeout(() => {
			runCheck("auto");
		}, 1500);
		const timer = window.setInterval(() => {
			runCheck("auto");
		}, store.intervalMin * 6e4);
		return () => {
			window.clearTimeout(wait);
			window.clearInterval(timer);
		};
	}, [
		hydrated,
		store.duty,
		store.intervalMin
	]);
	async function runCheck(mode) {
		if (busy.current) return;
		busy.current = true;
		setRunning(true);
		const pushLog = useWatch.getState().pushLog;
		const setStatus = useWatch.getState().setStatus;
		try {
			const snapshot = useWatch.getState();
			const response = await checkSearches({ data: { profiles: snapshot.profiles.map(sanitize) } });
			if (response.cooldown) {
				if (mode === "manual") setStatus({
					at: response.checkedAt,
					tone: "warn",
					text: response.message
				});
				return;
			}
			const seen = new Set(snapshot.seenIds);
			const freshFeed = [];
			const rememberIds = [];
			const problems = [];
			let found = 0;
			let sent = 0;
			let hadOk = false;
			for (const result of response.results) {
				if (!result.ok) {
					problems.push(result.message);
					pushLog({
						at: response.checkedAt,
						tone: "err",
						text: `${result.name}: ${result.message}`
					});
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
				freshFeed.push(...fresh.map((listing) => ({
					...listing,
					foundAt: response.checkedAt,
					profileName: result.name
				})));
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
					const delivery = await sendTelegram({ data: {
						token: snapshot.token,
						chatId: snapshot.chatId,
						text
					} });
					if (!delivery.ok) {
						failed = true;
						problems.push(delivery.message);
						pushLog({
							at: response.checkedAt,
							tone: "err",
							text: delivery.message
						});
						break;
					}
					sent += 1;
					rememberIds.push(listing.id);
				}
				if (!failed) {
					rememberIds.push(...result.listings.map((listing) => listing.id));
					const extra = (mode === "send-current" ? result.listings.length : fresh.length) - batch.length;
					if (extra > 0) await sendTelegram({ data: {
						token: snapshot.token,
						chatId: snapshot.chatId,
						text: `И ещё ${extra} объявлений в этой проверке. Откройте сторожа, чтобы посмотреть ленту.`
					} });
				}
			}
			if (rememberIds.length > 0) useWatch.getState().remember(rememberIds);
			if (freshFeed.length > 0) useWatch.getState().pushFeed(freshFeed);
			if (!snapshot.primed && mode !== "send-current" && hadOk) {
				useWatch.getState().setPrimed(true);
				const text = `Запомнил ${found} объявлений. В Telegram пришлю только новые.`;
				setStatus({
					at: response.checkedAt,
					tone: "ok",
					text
				});
				pushLog({
					at: response.checkedAt,
					tone: "ok",
					text
				});
				return;
			}
			if (sent > 0) {
				const text = mode === "send-current" ? `Отправил текущие объявления: ${sent}.` : `Новых квартир: ${sent}. Сообщения ушли в Telegram.`;
				setStatus({
					at: response.checkedAt,
					tone: "ok",
					text
				});
				pushLog({
					at: response.checkedAt,
					tone: "ok",
					text
				});
				return;
			}
			if (problems.length > 0 && !hadOk) {
				setStatus({
					at: response.checkedAt,
					tone: "err",
					text: problems[0]
				});
				return;
			}
			if (problems.length > 0) {
				setStatus({
					at: response.checkedAt,
					tone: "warn",
					text: problems[0]
				});
				return;
			}
			const text = snapshot.primed || mode === "send-current" ? "Новых квартир нет." : "Проверка ничего не вернула.";
			setStatus({
				at: response.checkedAt,
				tone: "ok",
				text
			});
			if (mode !== "auto") pushLog({
				at: response.checkedAt,
				tone: "ok",
				text
			});
		} catch {
			const at = (/* @__PURE__ */ new Date()).toISOString();
			setStatus({
				at,
				tone: "err",
				text: "Проверка сорвалась. Повторите через несколько секунд."
			});
			pushLog({
				at,
				tone: "err",
				text: "Проверка сорвалась до ответа Авито."
			});
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
			formatListingMessage(SAMPLE_LISTINGS[0])
		].join("\n");
		try {
			const delivery = await sendTelegram({ data: {
				token: snapshot.token,
				chatId: snapshot.chatId,
				text
			} });
			const at = (/* @__PURE__ */ new Date()).toISOString();
			if (!delivery.ok) {
				snapshot.pushLog({
					at,
					tone: "err",
					text: delivery.message
				});
				snapshot.setStatus({
					at,
					tone: "err",
					text: delivery.message
				});
			} else {
				const ok = "Тестовое сообщение ушло в Telegram.";
				snapshot.pushLog({
					at,
					tone: "ok",
					text: ok
				});
				snapshot.setStatus({
					at,
					tone: "ok",
					text: ok
				});
			}
		} catch {
			const at = (/* @__PURE__ */ new Date()).toISOString();
			snapshot.setStatus({
				at,
				tone: "err",
				text: "Не получилось отправить тест в Telegram."
			});
		} finally {
			setSending(false);
		}
	}
	const feed = store.feed.length > 0 ? store.feed : SAMPLE_LISTINGS.map((listing) => ({
		...listing,
		foundAt: "",
		profileName: "Пример",
		sample: true
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-w-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-11 items-center justify-center rounded-md bg-accent text-accent-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, {
							className: "size-5",
							"aria-hidden": "true"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl leading-none text-fg",
						children: "Сторож"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Новые квартиры с Авито — сразу в Telegram"
					})] })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm " + (store.duty ? "border-ok text-ok" : "border-border text-muted"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, {
						className: "size-4",
						"aria-hidden": "true"
					}), store.duty ? `Дежурство · каждые ${store.intervalMin} мин` : "Спит"]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 grid gap-5 lg:grid-cols-12",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "order-1 min-w-0 lg:order-2 lg:col-span-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						role: "status",
						className: "rounded-lg border px-4 py-3 text-sm " + (store.status?.tone === "err" ? "border-danger text-danger" : store.status?.tone === "warn" ? "border-warn text-warn" : "border-border text-fg"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: store.status?.text ?? "Первая проверка запоминает уже висящие объявления и ничего не шлёт." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-muted",
							children: ago(store.status?.at ?? null)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50",
							disabled: running,
							onClick: () => void runCheck("manual"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, {
								className: "size-4",
								"aria-hidden": "true"
							}), running ? "Смотрю Авито…" : "Проверить сейчас"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-fg disabled:opacity-50",
							disabled: running,
							onClick: () => void runCheck("send-current"),
							children: "Прислать то, что уже есть"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-serif text-2xl text-fg",
							children: "Лента"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 text-sm text-muted",
							onClick: () => store.resetMemory(),
							children: "Сбросить память"
						})]
					}),
					store.feed.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Живых объявлений пока нет. Ниже — пример того, как карточка и сообщение выглядят."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 grid gap-3",
						children: feed.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingCard, { item }, item.id + item.foundAt))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-8 font-serif text-2xl text-fg",
						children: "Журнал"
					}),
					store.log.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Здесь будут проверки и отправки в Telegram."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 grid gap-2",
						children: store.log.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-md border border-border bg-surface px-3 py-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: entry.tone === "err" ? "text-danger" : entry.tone === "warn" ? "text-warn" : "text-ok",
								children: entry.text
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block text-muted",
								children: ago(entry.at)
							})]
						}, entry.id))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "order-2 grid gap-5 lg:order-1 lg:col-span-5",
				children: [
					profile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-serif text-2xl text-fg",
									children: "Поиски"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-accent disabled:opacity-40",
									onClick: () => store.addProfile(),
									disabled: store.profiles.length >= 5,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
										className: "size-4",
										"aria-hidden": "true"
									}), "Ещё поиск"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 flex gap-2 overflow-x-auto pb-1",
								children: store.profiles.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => store.setActive(item.id),
									className: "min-h-11 shrink-0 rounded-md border px-3 text-sm " + (item.id === profile.id ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-fg"),
									children: item.name
								}, item.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-4 block text-sm text-muted",
								htmlFor: "search-name",
								children: "Название"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "search-name",
								className: "mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
								value: profile.name,
								onChange: (event) => store.patchProfile(profile.id, { name: event.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 flex gap-2",
								children: DEAL_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "min-h-11 flex-1 rounded-md border text-sm " + (profile.deal === option.value ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-fg"),
									onClick: () => store.patchProfile(profile.id, { deal: option.value }),
									children: option.label
								}, option.value))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-4 block text-sm text-muted",
								htmlFor: "city",
								children: "Город"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "city",
								list: "cities",
								className: "mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
								value: profile.city,
								onChange: (event) => store.patchProfile(profile.id, { city: event.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
								id: "cities",
								children: CITY_OPTIONS.map((city) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: city }, city))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm text-muted",
								children: "Комнаты"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1.5 flex flex-wrap gap-2",
								children: ROOM_OPTIONS.map((option) => {
									const on = profile.rooms.includes(option.value);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-pressed": on,
										className: "min-h-11 min-w-11 rounded-md border px-3 text-sm " + (on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-fg"),
										onClick: () => {
											const rooms = on ? profile.rooms.filter((room) => room !== option.value) : [...profile.rooms, option.value];
											store.patchProfile(profile.id, { rooms });
										},
										children: option.label
									}, option.value);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 grid gap-3 sm:grid-cols-2",
								children: SCALAR_FIELDS.filter((field) => field.group === "money").map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									id: field.key,
									label: field.label,
									value: field.kind === "money" ? formatMoneyInput(profile[field.key]) : profile[field.key],
									placeholder: field.placeholder,
									onChange: (value) => store.patchProfile(profile.id, { [field.key]: field.kind === "text" ? value : value.replace(/\D/g, "") })
								}, field.key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Площадь сверяется уже после загрузки объявления. Если в карточке её не оказалось, объявление не выкидываем."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									id: "districts",
									label: "Районы",
									value: profile.districts,
									placeholder: "Ленинский, Советский",
									onChange: (value) => store.patchProfile(profile.id, { districts: value })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1.5 text-sm text-muted",
									children: "Через запятую. Пусто — весь город."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
								className: "mt-4 rounded-md border border-border bg-surface-2 px-3 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
									className: "min-h-11 cursor-pointer list-none py-2 text-sm text-fg",
									children: "Дополнительно: слова, своя ссылка, прокси"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-3 pb-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "exclude",
											label: "Исключить слова",
											value: profile.excludeWords,
											placeholder: "доля, общежитие",
											onChange: (value) => store.patchProfile(profile.id, { excludeWords: value })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "block text-sm text-muted",
											htmlFor: "custom-url",
											children: "Своя ссылка поиска Авито"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											id: "custom-url",
											rows: 3,
											className: "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent",
											placeholder: "https://www.avito.ru/ivanovo/kvartiry/...",
											value: profile.customUrl,
											onChange: (event) => store.patchProfile(profile.id, { customUrl: event.target.value })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-muted",
											children: "Если вставить ссылку, город, комнаты и цена в запросе берутся из неё. Площадь, районы и исключения всё равно применяются здесь."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "block text-sm text-muted",
											htmlFor: "proxy",
											children: "HTTP-прокси, если Авито не пускает"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "proxy",
											className: "min-h-11 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-accent",
											placeholder: "http://логин:пароль@хост:порт",
											value: profile.proxyUrl,
											autoComplete: "off",
											onChange: (event) => store.patchProfile(profile.id, { proxyUrl: event.target.value })
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex min-h-11 items-center gap-2 text-sm text-fg",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										className: "size-4 accent-accent",
										checked: profile.enabled,
										onChange: (event) => store.patchProfile(profile.id, { enabled: event.target.checked })
									}), "Участвует в проверке"]
								}), store.profiles.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "inline-flex min-h-11 items-center gap-1 text-sm text-danger",
									onClick: () => store.removeProfile(profile.id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
										className: "size-4",
										"aria-hidden": "true"
									}), "Удалить"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 grid gap-1",
								children: links.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-warn",
									children: links.error
								}) : links.urls.map((url) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: url,
									target: "_blank",
									rel: "noreferrer",
									className: "flex min-h-11 w-full min-w-0 items-center gap-2 text-sm text-accent",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
										className: "size-4 shrink-0",
										"aria-hidden": "true"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate",
										children: url.replace("https://www.avito.ru", "avito.ru")
									})]
								}, url))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
									className: "size-5 text-accent",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-serif text-2xl text-fg",
									children: "Telegram"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Создайте бота в @BotFather, нажмите /start в чате с ним и узнайте chat id у @userinfobot."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-4 block text-sm text-muted",
								htmlFor: "token",
								children: "Токен бота"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "token",
								type: "password",
								autoComplete: "off",
								className: "mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
								value: store.token,
								onChange: (event) => store.setTelegram({ token: event.target.value.trim() })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-3 block text-sm text-muted",
								htmlFor: "chat",
								children: "Chat id"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "chat",
								className: "mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
								placeholder: "например 123456789",
								value: store.chatId,
								onChange: (event) => store.setTelegram({ chatId: event.target.value.trim() })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Токен остаётся в этом браузере и отправляется только в момент письма. В базу он не пишется."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-3 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-sm text-muted",
									htmlFor: "interval",
									children: "Интервал дежурства"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									id: "interval",
									className: "min-h-11 rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
									value: store.intervalMin,
									onChange: (event) => store.setIntervalMin(Number(event.target.value)),
									children: INTERVALS.map((minutes) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: minutes,
										children: [
											"каждые ",
											minutes,
											" мин"
										]
									}, minutes))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50",
									disabled: sending,
									onClick: () => void sendTest(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
										className: "size-4",
										"aria-hidden": "true"
									}), sending ? "Отправляю…" : "Тест в Telegram"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "inline-flex min-h-11 items-center justify-center rounded-md border px-4 " + (store.duty ? "border-ok text-ok" : "border-border bg-surface-2 text-fg"),
									onClick: () => store.setDuty(!store.duty),
									children: store.duty ? "Остановить дежурство" : "Включить дежурство"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm text-muted",
								children: store.primed ? "Память включена: повторно уже виденные квартиры не шлём." : "Память пустая: первая удачная проверка только запомнит текущие объявления."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-lg border border-border bg-surface p-4 text-sm text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-serif text-2xl text-fg",
								children: "Где держать сторожа"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-fg",
								children: "Обычный виртуальный хостинг вроде классического Beget не подойдёт: там нет постоянной проверки, а Авито быстро закрывает такие адреса."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: "Пока эта вкладка открыта, дежурство само ходит на Авито и пишет в Telegram. Вкладку можно свернуть, но не закрывать."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: "Круглосуточно и без браузера надёжнее маленький VPS в России — Beget VPS, Timeweb Cloud или Selectel. Если Авито ответит «проблема с IP», в поиске указывается HTTP-прокси, код для этого менять не нужно."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: "Цена, комнаты, площадь и районы правятся в карточке поиска. Второй город или другие условия — кнопка «Ещё поиск». Любой фильтр самого Авито, которого здесь нет, задаётся своей ссылкой."
							})
						]
					})
				]
			})]
		})]
	});
}
function Field({ id, label, value, placeholder, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm text-muted",
		htmlFor: id,
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			id,
			inputMode: "text",
			className: "mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-fg outline-none focus:border-accent",
			value,
			placeholder,
			onChange: (event) => onChange(event.target.value)
		})]
	});
}
function ListingCard({ item }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg border border-border bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-serif text-2xl text-fg",
					children: formatPrice(item.price)
				}), item.sample ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-md border border-warn px-2 py-1 text-xs text-warn",
					children: "пример"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted",
					children: item.profileName
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-1 text-base text-fg",
				children: item.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-3 grid grid-cols-3 gap-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted",
						children: "Комнаты"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-fg",
						children: formatRooms(item.rooms)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted",
						children: "Площадь"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-fg",
						children: formatArea(item.area)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted",
						children: "Район"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-fg",
						children: item.district ?? "—"
					})] })
				]
			}),
			item.sample ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Это не объявление, а образец сообщения."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				href: item.url,
				target: "_blank",
				rel: "noreferrer",
				className: "mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-accent",
				children: ["Открыть на Авито", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
					className: "size-4",
					"aria-hidden": "true"
				})]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WatchApp, {});
}
//#endregion
export { Home as component };
