# Prophezeiung Project Guidelines

## Style Guide

Der Style Guide unter `docs/STYLE_GUIDE.md` ist die zentrale Referenz für alle UI-Komponenten und Design-Entscheidungen. Bei der Entwicklung neuer Komponenten:

- **Immer zuerst den Style Guide konsultieren** bevor neue Komponenten erstellt werden
- **Bestehende Komponenten wiederverwenden** statt neue zu erstellen
- **Style Guide aktualisieren** wenn neue wiederverwendbare Komponenten hinzugefügt werden
- **Design-Konsistenz**: Cyan/Teal Glow-Effekte, Glasmorphismus, animierter Nebel

## Performance & Rerendering

React-Komponenten müssen auf Performance optimiert werden:

### Pflicht-Optimierungen

- **`memo()`**: Alle exportierten Komponenten mit `React.memo()` wrappen
- **`useMemo()`**: Für berechnete Werte und Style-Objekte verwenden
- **`useCallback()`**: Für Event-Handler und Funktionen die als Props weitergegeben werden

### Beispiel

```tsx
import { memo, useCallback, useMemo } from 'react';

export const MyComponent = memo(function MyComponent({ value, onChange }) {
  const computedStyle = useMemo(
    () => ({
      color: value > 0 ? 'green' : 'red',
    }),
    [value]
  );

  const handleChange = useCallback(
    (newValue: number) => {
      onChange?.(newValue);
    },
    [onChange]
  );

  return <div style={computedStyle}>...</div>;
});
```

### Vermeiden

- Inline Style-Objekte in JSX (verursachen Rerender)
- Inline Funktionen als Event-Handler (verursachen Rerender)
- Unnötige State-Updates

## API-Aufrufe

**Immer den zentralen `apiClient` verwenden** statt direkter `fetch()` Aufrufe:

```tsx
// ❌ Schlecht - direkter fetch
const res = await fetch('/api/rounds');
const data = await res.json();

// ✅ Gut - über apiClient
import { apiClient } from '@/lib/api-client/client';
const { data, error } = await apiClient.rounds.list();
```

### Vorteile des apiClient

- **Type-Safety**: Generierte TypeScript-Typen aus OpenAPI-Schema
- **Konsistente Fehlerbehandlung**: Einheitliches `{ data, error }` Pattern
- **Zentrale Konfiguration**: Credentials, Base-URL automatisch gesetzt

### Verfügbare Methoden

- `apiClient.auth.*` - Authentifizierung
- `apiClient.rounds.*` - Runden CRUD
- `apiClient.prophecies.*` - Prophezeiungen CRUD
- `apiClient.user.*` - Benutzerprofil, Avatar, Passkeys
- `apiClient.admin.users.*` - Admin Benutzerverwaltung

## Git Worktree Workflow

Features werden in separaten Git Worktrees entwickelt, dann per Fast-Forward Merge gemerged. Worktrees liegen im `worktrees/` Unterordner (Git ignoriert Ordner mit eigenem `.git` automatisch).

### Worktree erstellen

```bash
mkdir -p worktrees
git worktree add -b feature/<name> worktrees/<name> main
```

### .env im Worktree konfigurieren

Die `.env` muss kopiert und angepasst werden (NICHT committen!):

```bash
cp .env worktrees/<name>/.env
```

**Anpassungen:**

- `DATABASE_URL`: Gleicher Host, **andere Database** (z.B. `prophezeiung_<feature>`)
- `PORT`: Anderer Port (z.B. `3002` statt `3001`)
- `ADMIN_PASSWORD`: `admin` (einfach für lokale Entwicklung)

### Entwicklung

```bash
cd worktrees/<name>
npm install
npx prisma db push
# ... entwickeln und committen
```

### Vor dem Merge: Rebase auf main

```bash
git fetch --prune
git rebase main
npm test && npm run build
```

### Worktree entfernen und Fast-Forward Merge

```bash
# Zurück zum Hauptprojekt
cd /path/to/Prophezeiung
git worktree remove worktrees/<name>
git checkout feature/<name>
npm install

# Fast-Forward Merge
git checkout main
git merge --ff-only feature/<name>
git branch -d feature/<name>
```

### Branch-Naming

- `feature/<name>` - Neue Features
- `bugfix/<name>` - Bugfixes
