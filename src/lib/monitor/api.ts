import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const room = z.enum(["studio", "1", "2", "3", "4", "5"]);

const profileSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  enabled: z.boolean(),
  deal: z.enum(["sale", "rent"]),
  city: z.string().max(60),
  rooms: z.array(room).max(6),
  priceMin: z.string().regex(/^\d{0,12}$/),
  priceMax: z.string().regex(/^\d{0,12}$/),
  areaMin: z.string().regex(/^\d{0,4}$/),
  areaMax: z.string().regex(/^\d{0,4}$/),
  districts: z.string().max(200),
  excludeWords: z.string().max(200),
  customUrl: z.string().max(2000),
  proxyUrl: z.string().max(400),
});

const checkSchema = z.object({
  profiles: z.array(profileSchema).min(1).max(5),
});

const telegramSchema = z.object({
  token: z.string().min(8).max(200),
  chatId: z.string().min(2).max(80),
  text: z.string().min(1).max(3500),
});

let lastCheckAt = 0;

export const checkSearches = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkSchema.parse(input))
  .handler(async ({ data }) => {
    const now = Date.now();
    if (now - lastCheckAt < 8_000) {
      return {
        checkedAt: new Date(now).toISOString(),
        cooldown: true as const,
        message: "Подождите несколько секунд перед следующей проверкой.",
        results: [],
      };
    }
    lastCheckAt = now;
    const { runAvitoCheck } = await import("./fetch-avito.server");
    const enabled = data.profiles.filter((profile) => profile.enabled);
    const targets = enabled.length > 0 ? enabled : data.profiles.slice(0, 1);
    const results = [];
    for (const profile of targets) {
      results.push(await runAvitoCheck(profile));
    }
    return {
      checkedAt: new Date().toISOString(),
      cooldown: false as const,
      message: "",
      results,
    };
  });

export const sendTelegram = createServerFn({ method: "POST" })
  .validator((input: unknown) => telegramSchema.parse(input))
  .handler(async ({ data }) => {
    const { sendTelegramMessage } = await import("./telegram.server");
    return sendTelegramMessage(data.token, data.chatId, data.text);
  });
