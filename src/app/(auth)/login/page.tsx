"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { startAuthentication } from "@simplewebauthn/browser";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { PasswordInput } from "@/components/PasswordInput";
import { successToast, errorToast, infoToast, warningToast } from "@/lib/toast/toast-styles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const handlePasskeyLogin = useCallback(async () => {
    setIsPasskeyLoading(true);

    try {
      if (!globalThis.PublicKeyCredential) {
        notifications.show(errorToast(
          "Browser nicht unterstützt",
          "Dein Browser unterstützt keine Passkeys."
        ));
        setIsPasskeyLoading(false);
        return;
      }

      // 1. Authentication Options vom Server holen
      const optionsResponse = await fetch("/api/auth/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!optionsResponse.ok) {
        const data = await optionsResponse.json();
        notifications.show(errorToast(
          "Anmeldung fehlgeschlagen",
          data.error || "Fehler beim Starten der Anmeldung"
        ));
        setIsPasskeyLoading(false);
        return;
      }

      const { options, challengeKey } = await optionsResponse.json();

      // 2. Passkey-Authentifizierung starten
      let credential;
      try {
        credential = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            notifications.show(infoToast(
              "Abgebrochen",
              "Passkey-Anmeldung wurde abgebrochen."
            ));
          } else {
            notifications.show(errorToast(
              "Passkey-Fehler",
              err.message
            ));
          }
        } else {
          notifications.show(errorToast(
            "Fehler",
            "Passkey-Anmeldung fehlgeschlagen."
          ));
        }
        setIsPasskeyLoading(false);
        return;
      }

      // 3. Credential an Server senden zur Verifizierung
      const verifyResponse = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          challengeKey,
        }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        if (verifyResponse.status === 403) {
          notifications.show(warningToast(
            "Konto nicht freigegeben",
            data.error
          ));
        } else {
          notifications.show(errorToast(
            "Anmeldung fehlgeschlagen",
            data.error
          ));
        }
        setIsPasskeyLoading(false);
        return;
      }

      const data = await verifyResponse.json();
      notifications.show(successToast(
        `Angemeldet als ${data.user.displayName || data.user.username}`
      ));

      // Zur App weiterleiten
      router.push(callbackUrl);
    } catch (err) {
      console.error("Passkey login error:", err);
      notifications.show(errorToast(
        "Unerwarteter Fehler",
        "Bitte versuche es erneut."
      ));
    } finally {
      setIsPasskeyLoading(false);
    }
  }, [router, callbackUrl]);

  const handlePasswordLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          notifications.show(warningToast(
            "Konto nicht freigegeben",
            data.error
          ));
        } else {
          notifications.show(errorToast(
            "Anmeldung fehlgeschlagen",
            data.error || "Bitte überprüfe deine Eingaben."
          ));
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      notifications.show(successToast(
        `Angemeldet als ${data.user.displayName || data.user.username}`
      ));

      // Zur App weiterleiten
      router.push(callbackUrl);
    } catch (err) {
      notifications.show(errorToast(
        "Anmeldung fehlgeschlagen",
        "Ein Netzwerkfehler ist aufgetreten."
      ));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [username, password, router, callbackUrl]);

  return (
    <Card padding="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-white">Prophe</span>
          <span className="text-highlight">zeiung</span>
        </h1>
        <p className="text-(--text-secondary)">
          Die Sterne haben deine Ankunft vorausgesagt
        </p>
      </div>

      {/* Password Login Form */}
      <form onSubmit={handlePasswordLogin} className="space-y-4 mb-6">
        <TextInput
          label="Benutzername"
          placeholder="Dein Benutzername"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          required
          disabled={isLoading || isPasskeyLoading}
        />

        <PasswordInput
          label="Passwort"
          placeholder="Dein Passwort"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          disabled={isLoading || isPasskeyLoading}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-(--text-secondary) hover:text-cyan-400 transition-colors"
          >
            Passwort vergessen?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading || isPasskeyLoading || !username || !password}
          className="w-full"
        >
          {isLoading ? "Anmelden..." : "Anmelden"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[rgba(98,125,152,0.3)]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-[rgba(10,25,41,0.95)] text-(--text-muted)">oder</span>
        </div>
      </div>

      {/* Passkey Login */}
      <Button
        onClick={handlePasskeyLogin}
        disabled={isPasskeyLoading || isLoading}
        variant="outline"
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
            <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
          {isPasskeyLoading ? "Warte auf Passkey..." : "Mit Passkey anmelden"}
        </span>
      </Button>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-(--text-secondary)">
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card padding="p-8"><div className="text-center">Laden...</div></Card>}>
      <LoginForm />
    </Suspense>
  );
}
