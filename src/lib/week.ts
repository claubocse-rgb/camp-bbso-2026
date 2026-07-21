// Saptamana taberei: Luni 17 – Duminica 23 August 2026
export const CAMP_DAYS: { date: string; label: string; short: string }[] = [
  { date: '2026-08-17', label: 'Luni 17 aug', short: 'Lun 17' },
  { date: '2026-08-18', label: 'Marți 18 aug', short: 'Mar 18' },
  { date: '2026-08-19', label: 'Miercuri 19 aug', short: 'Mie 19' },
  { date: '2026-08-20', label: 'Joi 20 aug', short: 'Joi 20' },
  { date: '2026-08-21', label: 'Vineri 21 aug', short: 'Vin 21' },
  { date: '2026-08-22', label: 'Sâmbătă 22 aug', short: 'Sâm 22' },
  { date: '2026-08-23', label: 'Duminică 23 aug', short: 'Dum 23' },
]

// Zilele de studiu: 18 – 22 August (Marti – Sambata)
export const STUDY_DAYS = CAMP_DAYS.filter((d) => {
  const n = Number(d.date.slice(-2))
  return n >= 18 && n <= 22
})

export function dayLabel(date: string): string {
  return CAMP_DAYS.find((d) => d.date === date)?.label ?? date
}
