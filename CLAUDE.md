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
