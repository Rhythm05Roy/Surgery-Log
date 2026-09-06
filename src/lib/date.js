const pad = (n) => String(n).padStart(2, '0')

export function toLocalISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
