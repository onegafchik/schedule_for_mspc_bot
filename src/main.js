import { Bot, session } from "grammy"
import { limit } from "@grammyjs/ratelimiter"
import { freeStorage } from "@grammyjs/storage-free"
import dotenv from "dotenv"
import moment from "moment"
import nodeSchedule from "node-schedule"
import { MSPCScheduleService } from "./services/mspc-schedule-service.js"
import { menuKeyboard } from "./keyboard.js"

dotenv.config()

const bot = new Bot(process.env.TELEGRAM_API_TOKEN)

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
            console.log(`${moment().format("DD.MM:HH")}: Update schedule...`)

            try {
                await MSPCScheduleService.request()
                console.log(`${moment().format("DD.MM:HH")}: Schedule updated successful`)
            } catch {
                console.log(`${moment().format("DD.MM:HH")}: Schedule updated with error`)
            }
        })
    }
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
        onLimitExceeded: async (context) => await context.reply("Спам - это зло. Не делайте так") 
    }))

bot.command("start", async (context) => {
    context.session.isWaitingForNewGroup = true
    context.session.group = undefined
    
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

const phraseToIndex = ["Сегодня", "Завтра", "Понедельник"]

bot.hears(["Сегодня", "Завтра", "Понедельник"], async (context) => {
    if (context.session.isWaitingForNewGroup) {
        await context.reply("Укажите группу (Пример: 32Н)")
        return
    }

    const schedule = MSPCScheduleService.getSchedules[phraseToIndex.findIndex((value) => value === context.message.text)]

    if (schedule) {
        const scheduleForGroup = schedule.groups.find((group) => group.name == context.session.group)

        if (scheduleForGroup) {
            const lessonsString = scheduleForGroup.lessons
                .filter((row) => row.trim() !== "")
                .reduce((string, lesson) => string + lesson.trimLeft() + "\n", "")

            await context.reply(`Расписание на ${schedule.date} (${scheduleForGroup.name})\n\n${lessonsString}`)
        } else {
            await context.reply(`Расписание для ${!context.session.group ? "" : context.session.group} не найдено`)            
        }
    } else {
        await context.reply(`Расписание на ${context.message.text.toLowerCase()} недоступно`)
    }
})

start()