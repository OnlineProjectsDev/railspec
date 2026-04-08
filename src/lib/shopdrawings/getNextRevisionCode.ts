// /lib/shopdrawings/getNextRevisionCode.ts
export function getNextRevisionCode(current: string) {
  const normalized = (current || "A").trim().toUpperCase()

  if (!normalized) return "A"

  const chars = normalized.split("")
  let index = chars.length - 1

  while (index >= 0 && chars[index] === "Z") {
    chars[index] = "A"
    index -= 1
  }

  if (index < 0) {
    chars.unshift("A")
    return chars.join("")
  }

  chars[index] = String.fromCharCode(chars[index].charCodeAt(0) + 1)
  return chars.join("")
}