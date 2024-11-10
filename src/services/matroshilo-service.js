import path from "path"
import { readFile, writeFile } from "fs/promises"
import moment from "moment"

export class MatroshiloService {
    #tomatoesCount = 0
    #path

    constructor(path = "") {
        this.#path = path

        this.#getTomatoesFromFile()
            .then((data) => this.#tomatoesCount = data)
    }

    get getTomatoesCount() { return this.#tomatoesCount }

    async save() {
        try {
            await writeFile(path.resolve(this.#path), JSON.stringify({ tomatoesCount: this.#tomatoesCount }, null, 4), "utf-8")
            console.log(`[${moment().format("DD.MM HH:mm")}]: Tomato file saved successful`)
        } catch {
            console.log(`[${moment().format("DD.MM HH:mm")}]: Tomato file saving error`)
        }
    }

    add() {
        this.#tomatoesCount += 1
    }

    async #getTomatoesFromFile() {
        try {
            const data = await readFile(this.#path, "utf-8")
            const parsedData = await JSON.parse(data)
            return (parsedData.tomatoesCount ?? 0)
        } catch (error) {
            console.log(`[${moment().format("DD.MM HH:mm")}]: Tomato file reading error`)

            if (error.code === "ENOENT") {
                await this.save()
            }

            return 0
        }
    }
}