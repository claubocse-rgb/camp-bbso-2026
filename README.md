# Camp BBSO 2026 — aplicație de organizare tabără

Aplicație web instalabilă (PWA) pentru **echipa de organizatori** a taberei BBSO 2026.
V1: conturi doar pentru organizatori (login Google). Participanții sunt date, nu conturi.

## Stack
- **Frontend:** React + TypeScript + Vite, PWA (instalabilă pe Android/iOS fără magazin)
- **Backend:** Supabase (Auth Google, Postgres + RLS, Realtime, Storage)
- **Hosting:** Netlify

## Rulare locală
```bash
npm install
cp .env.example .env   # valorile sunt deja completate (cheie publică)
npm run dev
```

## Build
```bash
npm run build      # rezultat in dist/
npm run preview
```

## Structură
- `src/context/AuthProvider.tsx` — sesiune + profil + login/logout
- `src/components/Layout.tsx` — shell cu navigarea (sidebar desktop / bară jos mobil)
- `src/components/ProtectedRoute.tsx` — gardă: doar organizatori aprobați
- `src/pages/*` — Dashboard + taburile (multe încă stub, se completează pe etape)
- `src/lib/supabase.ts` — clientul Supabase

## Backend (Supabase)
Proiect: **Camp BBSO 2026** (`bzyqtnlbomqtcacteobf`, eu-central-1).
Tabele fundație: `profiles`, `study_teams`, `game_teams`, `participants`, `allowed_organizers`.
Accesul e controlat prin RLS; rolurile sunt `admin` / `organizer` / `pending`.

### Cum aprobi un organizator nou
Un admin adaugă emailul în `allowed_organizers`; la primul login Google, profilul
primește automat rolul potrivit. Fără email pe listă → cont `pending` (blocat).

## Pași manuali pentru „live"
Vezi **[SETUP.md](SETUP.md)** — publicare pe GitHub Pages, login Google, notificări push, remindere.

## Roadmap (pe etape)
1. ✅ Fundație: conturi, echipe, schelet PWA, navigare
2. ✅ Conținut: Orar, Echipe, Studiu (PDF), Jocuri, hartă camere
3. ✅ Interactiv: To-do (asumare task), Chat realtime
4. ✅ Notificări: push pe device, remindere înainte de activități, alerte, notificări in-app
5. ⏳ Deploy: GitHub Pages (workflow gata) + pașii din SETUP.md
