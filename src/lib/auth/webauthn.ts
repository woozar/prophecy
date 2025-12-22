// WebAuthn Konfiguration für Prophezeiung

// Relying Party (RP) Info - muss mit der Domain übereinstimmen
// In Entwicklung: localhost
// In Produktion: die tatsächliche Domain
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const rpName = "Prophezeiung";

// Origin muss das Protokoll und den Port enthalten
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3001";

export const webauthnConfig = {
  rpID,
  rpName,
  origin,
  // Timeout für Passkey-Operationen (60 Sekunden)
  timeout: 60000,
  // Wir bevorzugen Platform-Authenticators (TouchID, FaceID, Windows Hello)
  // aber erlauben auch Security Keys
  authenticatorSelection: {
    residentKey: "preferred" as const,
    userVerification: "preferred" as const,
    authenticatorAttachment: undefined, // Erlaubt sowohl platform als auch cross-platform
  },
  // Unterstützte Algorithmen
  supportedAlgorithmIDs: [-7, -257] as const, // ES256 und RS256
};

// Session-Speicher für Challenges (in Produktion sollte Redis verwendet werden)
const challengeStore = new Map<string, { challenge: string; expires: number }>();

export function storeChallenge(userId: string, challenge: string): void {
  // Challenge läuft nach 5 Minuten ab
  const expires = Date.now() + 5 * 60 * 1000;
  challengeStore.set(userId, { challenge, expires });
}

export function getChallenge(userId: string): string | null {
  const stored = challengeStore.get(userId);
  if (!stored) return null;

  if (Date.now() > stored.expires) {
    challengeStore.delete(userId);
    return null;
  }

  return stored.challenge;
}

export function clearChallenge(userId: string): void {
  challengeStore.delete(userId);
}

// Cleanup abgelaufener Challenges (wird periodisch aufgerufen)
export function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [userId, stored] of challengeStore.entries()) {
    if (now > stored.expires) {
      challengeStore.delete(userId);
    }
  }
}
