import { Bot, GrammyError, HttpError, session } from "grammy"
import { limit } from "@grammyjs/ratelimiter"
import { freeStorage } from "@grammyjs/storage-free"
import dotenv from "dotenv"
import moment from "moment"
import nodeSchedule from "node-schedule"
import path from "path"
import { MSPCScheduleService } from "./services/mspc-schedule-service.js"
import { menuKeyboard } from "./keyboard.js"
import { MatroshiloService } from "./services/matroshilo-service.js"
import { random } from "./utils/math.js"

import matroshiloConfig from "../config/matroshilo-config.json" assert { type: "json" }

dotenv.config()

const bot = new Bot(process.env.TELEGRAM_API_TOKEN)

const matroshiloService = new MatroshiloService(path.resolve("tomatoes.json"))

function start() {
    bot.start()

    MSPCScheduleService.request()

    const timesForRequest = process.env.TIMES_FOR_REQUEST.split(" ").map((time) => Number(time) ?? 10)

    for (const time of timesForRequest) {
        nodeSchedule.scheduleJob({
            hour: time,
            minute: 0,
            tz: "Europe/Minsk"
        }, async () => {
            console.log(`[${moment().format("DD.MM HH")}]: Update schedule...`)

            try {
                await MSPCScheduleService.request()
                console.log(`[${moment().format("DD.MM HH")}]: Schedule updated successful`)
            } catch {
                console.log(`[${moment().format("DD.MM HH")}]: Schedule updated with error`)
            }
        })
    }

    nodeSchedule.scheduleJob("* */20 * * * *", () => matroshiloService.save())
}

bot
    .use(session({
        initial: () => ({
            isWaitingForNewGroup: true,
            group: undefined
        }),
        storage: freeStorage(bot.token)
    }))
    .use(limit({
        timeFrame: 1000 * 10,
        limit: 10,
        onLimitExceeded: async (context) => await context.reply("Спам - это плохо. Не делайте так") 
    }))

bot.command("start", async (context) => {
    context.session.isWaitingForNewGroup = true
    context.session.group = undefined
    
    await context.reply("Бот запущен 🎉")
    await context.reply("Укажите группу (Пример: 32Н)")
})

bot.hears(/^\d{2}[A-ZА-Я]$/, async (context) => {
    if (context.session.isWaitingForNewGroup) {
        context.session.group = context.message.text
        context.session.isWaitingForNewGroup = false

        await context.reply(`Группа изменена на ${context.message.text}`, {
            reply_markup: menuKeyboard
        })
    }
})

bot.hears("Сменить группу", async (context) => {
    context.session.isWaitingForNewGroup = true
    await context.reply("Укажите группу (Пример: 32Н)")
})

const phrasesTuple = ["Сегодня", "Завтра", "Понедельник"]

bot.hears([...phrasesTuple], async (context) => {
    if (context.session.isWaitingForNewGroup) {
        await context.reply("Укажите группу (Пример: 32Н)")
        return
    }

    const schedule = MSPCScheduleService.getSchedules[phrasesTuple.findIndex((value) => value === context.message.text)]

    if (schedule) {
        const scheduleForGroup = schedule.groups.find((group) => group.name == context.session.group)

        if (scheduleForGroup) {
            const lessonsString = scheduleForGroup.lessons
                .filter((row) => row.trim() !== "")
                .map((row) => row.trimLeft())
                .map((row) => /\d/.test(row[0]) ? `\n${row[0] + ")" + row.substring(1)}` : row)
                .reduce((string, lesson) => string + lesson + "\n", "")

            await context.reply(`Расписание на ${schedule.date} (${scheduleForGroup.name})\n${lessonsString}`)
        } else {
            await context.reply(`Расписание для ${!context.session.group ? "" : context.session.group} не найдено`)            
        }
    } else {
        await context.reply(`Расписание на ${context.message.text.toLowerCase()} недоступно`)
    }
})

bot.hears("Кинуть 🍅 в Матрошило", async (context) => {
    const change = random(1, 100)
    let phrase = ""

    if (change <= matroshiloConfig.chanceOfHit) {
        matroshiloService.add()
        phrase = `✅ ${matroshiloConfig.phrases.hitGoodPhrases[random(0, matroshiloConfig.phrases.hitGoodPhrases.length - 1)]}` 
    } else {
        phrase = `❌ ${matroshiloConfig.phrases.hitBadPhrases[random(0, matroshiloConfig.phrases.hitBadPhrases.length - 1)]}`
    }

    await context.reply(phrase ?? "")
})

bot.hears("Сколько 🍅", async (context) => {
    await context.reply(matroshiloConfig.phrases.all.replaceAll("$count", matroshiloService.getTomatoesCount) ?? "")
})

bot.catch((error) => {
    const errorCause = error.error

    if (errorCause instanceof GrammyError) {
        console.log("Request error: ", errorCause)
    } else if (errorCause instanceof HttpError) {
        console.log("Could not contact Telegram ", errorCause)
    } else {
        console.log("Unknown error: ", errorCause)
    }
})

start()