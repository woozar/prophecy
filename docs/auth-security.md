# Authentifizierung & Sicherheit

## Passwort-Hashing

Passwörter werden mit **bcrypt** gehasht. Bcrypt ist ein speziell für Passwörter entwickelter Algorithmus mit folgenden Eigenschaften:

### Automatisches Salting

Bcrypt generiert automatisch einen zufälligen Salt für jedes Passwort. Der Salt wird im Hash-String selbst gespeichert:

```
$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWWHLmW2m6a
│  │  │                      │
│  │  │                      └── Hash + Salt (kombiniert)
│  │  └── Salt (22 Zeichen)
│  └── Cost-Faktor (12 Runden = 2^12 Iterationen)
└── Algorithmus-Version (2b)
```

### Kein separater Salt nötig

- **Kein `SALT` in `.env` erforderlich**
- Der Salt ist im Hash eingebettet
- Jedes Passwort hat einen eigenen, einzigartigen Salt
- `bcrypt.compare()` extrahiert den Salt automatisch beim Vergleich

### Cost-Faktor

Der Cost-Faktor `12` bedeutet 2^12 = 4096 Iterationen. Das macht Brute-Force-Angriffe zeitaufwändig:

| Cost | Iterationen | ca. Zeit/Hash |
| ---- | ----------- | ------------- |
| 10   | 1.024       | ~100ms        |
| 12   | 4.096       | ~300ms        |
| 14   | 16.384      | ~1s           |

## Verwendung im Code

```typescript
import bcrypt from 'bcrypt';

// Passwort hashen (Salt wird automatisch generiert)
const hash = await bcrypt.hash(password, 12);

// Passwort verifizieren (Salt wird automatisch aus hash extrahiert)
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

## WebAuthn / Passkeys

Zusätzlich zu Passwörtern unterstützt die App Passkey-Authentifizierung (WebAuthn):

- Kryptografische Schlüsselpaare statt Passwörter
- Private Key verlässt nie das Gerät
- Phishing-resistent
- Biometrische Authentifizierung möglich

Siehe `/src/lib/auth/webauthn.ts` für die Implementierung.
