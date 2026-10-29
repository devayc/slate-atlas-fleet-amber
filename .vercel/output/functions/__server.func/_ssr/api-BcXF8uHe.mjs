import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { n as array, o as object, r as boolean, s as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BcXF8uHe.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var lastCheckAt = 0;
var checkSearches_createServerFn_handler = createServerRpc({
	id: "421fa72af96579c30b1195b92c3894f06d6e52474795ada1a5744b0955e0da7f",
	name: "checkSearches",
	filename: "src/lib/monitor/api.ts"
}, (opts) => checkSearches.__executeServer(opts));
var checkSearches = createServerFn({ method: "POST" }).validator((input) => checkSchema.parse(input)).handler(checkSearches_createServerFn_handler, async ({ data }) => {
	const now = Date.now();
	if (now - lastCheckAt < 8e3) return {
		checkedAt: new Date(now).toISOString(),
		cooldown: true,
		message: "Подождите несколько секунд перед следующей проверкой.",
		results: []
	};
	lastCheckAt = now;
	const { runAvitoCheck } = await import("./fetch-avito.server-BM11tA2G.mjs");
	const enabled = data.profiles.filter((profile) => profile.enabled);
	const targets = enabled.length > 0 ? enabled : data.profiles.slice(0, 1);
	const results = [];
	for (const profile of targets) results.push(await runAvitoCheck(profile));
	return {
		checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
		cooldown: false,
		message: "",
		results
	};
});
var sendTelegram_createServerFn_handler = createServerRpc({
	id: "d7c633178f75cb57bef7a5ccdae92985b7d5457d2f3eff2fb3921df46eeaf634",
	name: "sendTelegram",
	filename: "src/lib/monitor/api.ts"
}, (opts) => sendTelegram.__executeServer(opts));
var sendTelegram = createServerFn({ method: "POST" }).validator((input) => telegramSchema.parse(input)).handler(sendTelegram_createServerFn_handler, async ({ data }) => {
	const { sendTelegramMessage } = await import("./telegram.server-BexbjomV.mjs");
	return sendTelegramMessage(data.token, data.chatId, data.text);
});
//#endregion
export { checkSearches_createServerFn_handler, sendTelegram_createServerFn_handler };
