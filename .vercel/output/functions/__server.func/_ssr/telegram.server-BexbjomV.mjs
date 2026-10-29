//#region node_modules/.nitro/vite/services/ssr/assets/telegram.server-BexbjomV.js
var TOKEN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
function humanize(description) {
	const text = description.toLowerCase();
	if (text.includes("unauthorized") || text.includes("not found")) return "Токен не подошёл. Скопируйте его целиком из @BotFather.";
	if (text.includes("chat not found") || text.includes("chat_id")) return "Чат не найден. Напишите своему боту /start и проверьте chat id.";
	if (text.includes("blocked")) return "Бот заблокирован в этом чате. Разблокируйте его в Telegram.";
	if (text.includes("too many")) return "Telegram просит подождать: слишком много сообщений подряд.";
	return "Telegram не принял сообщение. Проверьте токен и chat id.";
}
async function sendTelegramMessage(token, chatId, text) {
	const cleanToken = token.trim();
	const cleanChat = chatId.trim();
	if (!TOKEN.test(cleanToken)) return {
		ok: false,
		message: "Похоже, токен бота неполный. Его выдаёт @BotFather."
	};
	if (!/^-?\d{4,}$/.test(cleanChat) && !/^@[A-Za-z0-9_]{4,}$/.test(cleanChat)) return {
		ok: false,
		message: "Chat id — это число (для группы начинается с -100). Узнать его можно у @userinfobot."
	};
	if (text.length > 3500) return {
		ok: false,
		message: "Сообщение слишком длинное."
	};
	let response;
	try {
		response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				chat_id: cleanChat,
				text,
				disable_web_page_preview: false
			}),
			signal: AbortSignal.timeout(15e3)
		});
	} catch {
		return {
			ok: false,
			message: "Не удалось связаться с Telegram. Повторите через минуту."
		};
	}
	const payload = await response.json().catch(() => null);
	if (!response.ok || !payload?.ok) return {
		ok: false,
		message: humanize(payload?.description ?? "")
	};
	return { ok: true };
}
//#endregion
export { sendTelegramMessage };
