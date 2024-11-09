export function random(minValue, maxValue) {
    return Math.floor(Math.random() * (maxValue - minValue + 1) + minValue)
}