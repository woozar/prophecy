# Prophezeiung

Eine Next.js App für Vorhersagen und Bewertungen.

## Setup

```bash
npm install
npm run dev
```

Die App läuft auf [http://localhost:3001](http://localhost:3001).

## Technologie-Stack

- **Frontend:** Next.js 16, React 19, Mantine UI, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Datenbank:** PostgreSQL
- **Auth:** Passkey (WebAuthn) + Passwort

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
