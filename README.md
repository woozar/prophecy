# Prophezeiung

Eine Next.js App für Vorhersagen und Bewertungen.

## Voraussetzungen

- Node.js 18+
- PostgreSQL
- npm oder pnpm

## Setup

```bash
# 1. Dependencies installieren
npm install

# 2. .env erstellen (siehe .env.example)
cp .env.example .env

# 3. Datenbank initialisieren
npx prisma db push

# 4. Entwicklungsserver starten
npm run dev
```

Die App läuft auf [http://localhost:3001](http://localhost:3001).

### Umgebungsvariablen

| Variable         | Beschreibung                   | Beispiel                                             |
| ---------------- | ------------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL Connection String   | `postgresql://user:pass@localhost:5432/prophezeiung` |
| `PORT`           | Server-Port                    | `3001`                                               |
| `ADMIN_PASSWORD` | Initiales Admin-Passwort       | (sicher wählen)                                      |
| `OPENAI_API_KEY` | Für KI-Bot Kimberly (optional) | `sk-...`                                             |

## Projektstruktur

```
src/
├── app/           # Next.js App Router (Pages & API Routes)
├── components/    # React-Komponenten
├── hooks/         # Custom React Hooks
├── lib/           # Utilities, Services, Schemas
│   ├── api-client/  # Generierter OpenAPI Client
│   ├── auth/        # Authentifizierung (WebAuthn, Sessions)
│   ├── schemas/     # Zod Validierungsschemas
│   └── sse/         # Server-Sent Events
├── store/         # Zustand State Management
└── types/         # TypeScript Definitionen
```

## Technologie-Stack

- **Frontend:** Next.js 16, React 19, Mantine UI, Tailwind CSS v4
- **Backend:** Next.js API Routes, Prisma ORM
- **Datenbank:** PostgreSQL
- **Auth:** Passkey (WebAuthn) + Passwort
- **State:** Zustand mit SSE für Echtzeit-Updates
- **API:** OpenAPI-generierte TypeScript-Typen

## Features

- **Vorhersagen:** Erstellen, bearbeiten und bewerten von Prophezeiungen
- **Runden:** Zeitbasierte Vorhersage-Runden mit Fristen
- **Bewertungen:** -10 bis +10 Skala mit Farbcodierung
- **Authentifizierung:** Sichere Passkey-Anmeldung (WebAuthn) oder klassisches Passwort
- **KI-Bot:** "Kimberly" erstellt automatisch Vorhersagen und bewertet (OpenAI)
- **Avatar-Effekte:** Animierte Glow/Partikel-Effekte auf Profilbildern
- **Statistiken:** Leaderboards und Auswertungen pro Runde
- **Admin-Panel:** Benutzer- und Rundenverwaltung

## Hinweise

### Bearbeiten von Prophezeiungen

Beim Bearbeiten einer Prophezeiung werden alle bisherigen Bewertungen gelöscht.
Dies ist beabsichtigt, da eine geänderte Vorhersage neu bewertet werden muss.

### Infrastruktur (Reverse Proxy)

- Rate Limiting erfolgt im Reverse Proxy
- Dateigrößenlimit: 10 MB (konfiguriert im Reverse Proxy)

## Entwicklung

```bash
# Tests ausführen
npm test

# Lint
npm run lint

# Formatierung
npm run format
```
