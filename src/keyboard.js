import { Keyboard } from "grammy"

export const menuKeyboard = new Keyboard()
    .text("Сменить группу").row()
    .text("Сегодня").text("Завтра").row()
    .text("Понедельник").row()
    .text("Кинуть 🍅 в Матрошило").text("Сколько 🍅").row()
    .resized()