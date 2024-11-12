import { XMLParser } from "fast-xml-parser"
import moment from "moment-timezone"

export class MSPCScheduleService {
    static #parser = new XMLParser()

    static #schedules = [null, null, null]

    constructor() {}

    static get getSchedules() { return MSPCScheduleService.#schedules }

    static async request() {
        const dates = [moment(), moment().add(1, "day"), moment().day(8)]
        
        let index = 0
        for await (const date of dates) {
            try {
                const response = await fetch(`https://pnl1-word-view.officeapps.live.com/wv/ResReader.ashx?n=p_1_10.xml&v=00000000-0000-0000-0000-000000000802&usid=5cad53d1-2333-4344-9258-05f17d369909&build=20241101.9&WOPIsrc=https%3A%2F%2Fpnl1%2Dview%2Dwopi%2Ewopi%2Eonline%2Eoffice%2Enet%3A810%2Foh%2Fwopi%2Ffiles%2F%40%2FwFileId%3FwFileId%3Dhttps%253A%252F%252Fmgpk%252Ebntu%252Eby%253A443%252Fwp%252Dcontent%252Fuploads%252F${date.format("YYYY")}%252F${date.format("MM")}%252F${date.format("DD")}%252E${date.format("MM")}%252E${date.format("YYYY")}%252Draspisanie%252Duchashhihsya%252Edoc&access_token=1&access_token_ttl=0&z=08d1f5ad785e38636e7f2fb8111df4350059e0ff692121a06ac9f313c13fdbbc&waccluster=PNL1`)
                const data = await response.text()

                if (response.status !== 200) {
                    return null
                }

                const parsedData = await MSPCScheduleService.#parser.parse(data)

                const schedule = this.#createSchedule(parsedData)
                MSPCScheduleService.#schedules[index] = schedule
            } catch (error) {
                console.log(`Request schedule for ${date.format("DD.MM.YYYY")} error: ${error}`)
                MSPCScheduleService.#schedules[index] = null
            } finally {
                index += 1
            }
        }
    }

    static #createSchedule(parsedData) {
        const schedule = {
            date: "",
            groups: []
        }

        let date = parsedData.Pages.Page[0].P[0]?.T
        Array.isArray(date) ? date = date[0] : date

        schedule.date = date.match(/\d{2}\.\d{2}\.\d{4}/).at(0) ?? ""

        let groups = []

        try {
            parsedData.Pages.Page.forEach(({ P }) => {
                P
                    .filter(({ T }) => T !== undefined)
                    .forEach(({ T }) => {
                        if (Array.isArray(T)) {
                            return
                        }

                        const row = T
                            .split("│")
                            .filter((row) => row != "")

                        const isRowAboutGroup = row.every((row) => /\d{2}[а-яА-Я]/.test(row))

                        if (isRowAboutGroup) {
                            schedule.groups = [...schedule.groups, ...groups]
    
                            groups = row.map((row) => ({
                                name: row.trim(),
                                lessons: []
                            }))

                        } else {
                            if (groups.length !== 0 && T.split("").some((letter) => letter == "│")) {
                                row.forEach((row, index) => groups[index].lessons = [...groups[index].lessons, row.replace(/;\&\#45\;|\&\#45/g, " ")])
                            }
                        }
                    })
            })
        } catch {
            return null
        }

        return schedule
    }
}