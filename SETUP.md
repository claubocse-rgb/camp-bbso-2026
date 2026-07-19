# Configurare „live" — Camp BBSO 2026

Pași unici, din conturile tale. După ei, aplicația e instalabilă pe telefon și totul funcționează.
Ordinea recomandată: **1 → 2 → 3 → (4 opțional)**.

> ⚠️ Repo-ul e **public** (necesar pentru GitHub Pages gratuit). NU pune niciodată aici chei
> private / secrete. Cheile publice (Supabase anon, VAPID public) sunt safe — sunt oricum
> trimise în browser. Valorile secrete (VAPID **privat**, CRON_SECRET) ți le-am dat separat, în chat.

---

## 1. Publicare pe GitHub Pages

1. Fă repo-ul **public**: GitHub → repo → **Settings → General → Danger Zone → Change visibility → Public**.
2. Activează Pages: **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.
3. Gata — la fiecare `git push` pe `main`, workflow-ul `.github/workflows/deploy.yml` face build și publică.
   Adresa va fi: **https://claubocse-rgb.github.io/camp-bbso-2026/**

## 2. Login cu Google (Supabase + Google Cloud)

1. **Google Cloud Console** → APIs & Services → **Credentials** → *Create credentials* → **OAuth client ID** → tip **Web application**.
   - Authorized redirect URI: `https://bzyqtnlbomqtcacteobf.supabase.co/auth/v1/callback`
   - Salvează → copiază **Client ID** și **Client Secret**.
2. **Supabase** → proiect *Camp BBSO 2026* → **Authentication → Providers → Google** → Enable → lipește Client ID + Secret → Save.
3. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://claubocse-rgb.github.io/camp-bbso-2026/`
   - **Redirect URLs** (adaugă): `https://claubocse-rgb.github.io/camp-bbso-2026/**`

După asta, „Continuă cu Google" funcționează. Tu (clau.bocse@gmail.com) intri direct ca **admin**.
Ceilalți organizatori: îi adaugi pe listă din baza de date (tabel `allowed_organizers`) sau îți zic eu cum facem un mic ecran de admin.

## 3. Notificări push pe telefon (VAPID)

1. **Supabase → Project Settings → Edge Functions → Secrets** (sau Edge Functions → Manage secrets) → adaugă:
   - `VAPID_PUBLIC_KEY` = *(cheia publică — ți-am dat-o; e și în workflow)*
   - `VAPID_PRIVATE_KEY` = *(cheia privată — ți-am dat-o în chat, secretă)*
   - `VAPID_SUBJECT` = `mailto:clau.bocse@gmail.com`
2. Atât — edge function `send-push` e deja deployată. În aplicație, din clopoțel activezi „Notificări pe acest dispozitiv".
   - **iOS:** push-ul merge DOAR dacă adaugi aplicația pe ecranul principal (Safari → Share → *Add to Home Screen*), apoi o deschizi de acolo și accepți notificările.
   - **Android:** merge direct din browser după instalare.

## 4. Remindere automate înainte de activități (opțional, pg_cron)

Edge function `activity-reminders` e deployată. Ca să ruleze automat în fiecare minut:

1. Adaugă secretul `CRON_SECRET` la Edge Functions (valoarea ți-am dat-o în chat).
2. În **Supabase → SQL Editor** rulează (cu CRON_SECRET-ul tău în loc de `PUNE_SECRETUL`):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('bbso-reminders', '* * * * *', $$
  select net.http_post(
    url    := 'https://bzyqtnlbomqtcacteobf.functions.supabase.co/activity-reminders',
    headers:= '{"x-cron-secret":"PUNE_SECRETUL"}'::jsonb
  );
$$);
```

Ca să oprești: `select cron.unschedule('bbso-reminders');`

---

## Recapitulare tehnică
- **Frontend:** React + Vite (PWA), servit din `/camp-bbso-2026/` pe GitHub Pages.
- **Backend:** Supabase (Auth Google, Postgres + RLS, Realtime, Storage, Edge Functions).
- **Push:** Web Push cu VAPID; `send-push` (apelată din app), `activity-reminders` (cron).
