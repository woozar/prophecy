"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { startRegistration } from "@simplewebauthn/browser";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { PasswordInput } from "@/components/PasswordInput";
import { GlowBadge } from "@/components/GlowBadge";
import { successToast, errorToast, infoToast } from "@/lib/toast/toast-styles";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const isUsernameValid = username.length >= 3;
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === passwordConfirm;
  const isFormValid = isUsernameValid && isPasswordValid && doPasswordsMatch;

  const handlePasswordRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          displayName: displayName || username,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        notifications.show(errorToast(
          "Registrierung fehlgeschlagen",
          data.error || "Fehler bei der Registrierung"
        ));
        setIsLoading(false);
        return;
      }

      notifications.show(successToast(
        "Registrierung erfolgreich!",
        "Dein Konto wurde erstellt. Ein Admin muss es noch freigeben."
      ));

      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err) {
      console.error("Registration error:", err);
      notifications.show(errorToast(
        "Unerwarteter Fehler",
        "Bitte versuche es erneut."
      ));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, displayName, isFormValid, router]);

  const handlePasskeyRegister = useCallback(async () => {
    if (!isUsernameValid) {
      notifications.show(errorToast(
        "Benutzername fehlt",
        "Bitte gib zuerst einen Benutzernamen ein."
      ));
      return;
    }

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

      const optionsResponse = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: displayName || username,
        }),
      });

      if (!optionsResponse.ok) {
        const data = await optionsResponse.json();
        notifications.show(errorToast(
          "Registrierung fehlgeschlagen",
          data.error || "Fehler beim Starten der Registrierung"
        ));
        setIsPasskeyLoading(false);
        return;
      }

      const { options, tempUserId, username: normalizedUsername, displayName: finalDisplayName } = await optionsResponse.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            notifications.show(infoToast(
              "Abgebrochen",
              "Passkey-Erstellung wurde abgebrochen."
            ));
          } else if (err.name === "InvalidStateError") {
            notifications.show(errorToast(
              "Passkey existiert bereits",
              "Dieser Passkey ist bereits registriert."
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
            "Passkey-Erstellung fehlgeschlagen."
          ));
        }
        setIsPasskeyLoading(false);
        return;
      }

      const verifyResponse = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          tempUserId,
          username: normalizedUsername,
          displayName: finalDisplayName,
        }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        notifications.show(errorToast(
          "Registrierung fehlgeschlagen",
          data.error || "Fehler bei der Verifizierung"
        ));
        setIsPasskeyLoading(false);
        return;
      }

      notifications.show(successToast(
        "Registrierung erfolgreich!",
        "Dein Konto wurde erstellt. Ein Admin muss es noch freigeben."
      ));

      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err) {
      console.error("Registration error:", err);
      notifications.show(errorToast(
        "Unerwarteter Fehler",
        "Bitte versuche es erneut."
      ));
    } finally {
      setIsPasskeyLoading(false);
    }
  }, [username, displayName, isUsernameValid, router]);

  return (
    <Card padding="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-white">Prophe</span>
          <span className="text-highlight">zeiung</span>
        </h1>
        <p className="text-(--text-secondary)">
          Dein Schicksal beginnt hier
        </p>
      </div>

      {/* Password Register Form */}
      <form onSubmit={handlePasswordRegister} className="space-y-4 mb-6">
        <TextInput
          label="Benutzername"
          placeholder="mindestens 3 Zeichen"
          description="Wird für die Identifikation verwendet"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value.toLowerCase().replaceAll(/[^a-z0-9_-]/g, ''))}
          error={username.length > 0 && username.length < 3 ? "Mindestens 3 Zeichen" : undefined}
          required
          disabled={isLoading || isPasskeyLoading}
        />

        <TextInput
          label="Anzeigename"
          placeholder={username || "Wie sollen andere dich sehen?"}
          description="Optional - standardmäßig dein Benutzername"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          disabled={isLoading || isPasskeyLoading}
        />

        <PasswordInput
          label="Passwort"
          placeholder="mindestens 8 Zeichen"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          error={password.length > 0 && password.length < 8 ? "Mindestens 8 Zeichen" : undefined}
          required
          disabled={isLoading || isPasskeyLoading}
        />

        <PasswordInput
          label="Passwort bestätigen"
          placeholder="Passwort wiederholen"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
          error={passwordConfirm.length > 0 && !doPasswordsMatch ? "Passwörter stimmen nicht überein" : undefined}
          required
          disabled={isLoading || isPasskeyLoading}
        />

        <Button
          type="submit"
          disabled={isLoading || isPasskeyLoading || !isFormValid}
          className="w-full"
        >
          {isLoading ? "Registriere..." : "Mit Passwort registrieren"}
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

      {/* Passkey Register */}
      <Button
        onClick={handlePasskeyRegister}
        disabled={isPasskeyLoading || isLoading || !isUsernameValid}
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
          {isPasskeyLoading ? "Erstelle Passkey..." : "Mit Passkey registrieren"}
        </span>
      </Button>

      {/* Info about passkey */}
      <div className="mt-6 p-3 rounded-lg bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.2)]">
        <div className="flex items-start gap-2">
          <GlowBadge size="sm">Info</GlowBadge>
          <p className="text-sm text-(--text-secondary)">
            Passkeys sind sicherer als Passwörter und ermöglichen schnelles Anmelden per Fingerabdruck, Gesicht oder PIN.
          </p>
        </div>
      </div>

      {/* Admin approval notice */}
      <div className="mt-4 p-3 rounded-lg bg-[rgba(16,42,67,0.5)] border border-[rgba(98,125,152,0.3)]">
        <p className="text-sm text-(--text-secondary)">
          <span className="text-cyan-400 font-medium">Hinweis:</span>{" "}
          Nach der Registrierung muss dein Konto von einem Admin freigegeben werden.
        </p>
      </div>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-(--text-secondary)">
          Bereits ein Konto?{" "}
          <Link
            href="/login"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </Card>
  );
}
