# Barrierefreiheit Checkliste

Diese Checkliste fasst die Anforderungen für barrierefreie Websites zusammen, basierend auf:

- **BFSG** (Barrierefreiheitsstärkungsgesetz)
- **WCAG 2.1/2.2** Level AA
- **EN 301 549**
- **BITV 2.0**

---

## Gesetzliche Grundlagen

### Barrierefreiheitsstärkungsgesetz (BFSG)

| Aspekt        | Details                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| **Stichtag**  | 28. Juni 2025                                                                                         |
| **Betroffen** | B2C-Websites mit Dienstleistungen (Webshops, Buchungssysteme, Kontaktformulare)                       |
| **Ausnahmen** | Kleinstunternehmen (weniger als 10 Mitarbeiter UND weniger als 2 Mio. EUR Umsatz), reine B2B-Angebote |
| **Standard**  | WCAG 2.1 Level AA (via EN 301 549)                                                                    |
| **Bußgelder** | Bis zu 100.000 EUR, Verbandsklagen möglich                                                            |

### Pflichtdokumente

- [ ] **Erklärung zur Barrierefreiheit** veröffentlicht
- [ ] **Feedback-Mechanismus** für Barriere-Meldungen vorhanden
- [ ] Kontaktmöglichkeit für Barrierefreiheits-Anfragen

---

## Die 4 WCAG-Prinzipien

### 1. Wahrnehmbar (Perceivable)

Informationen müssen von allen Nutzern aufgenommen werden können.

#### Textalternativen

- [ ] Alle Bilder haben aussagekräftige alt-Texte
- [ ] Dekorative Bilder haben leeres alt-Attribut und aria-hidden="true"
- [ ] Icons haben aria-label oder sind mit aria-hidden="true" versteckt
- [ ] Komplexe Grafiken haben ausführliche Beschreibungen

#### Zeitbasierte Medien

- [ ] Videos haben Untertitel
- [ ] Audio-Inhalte haben Transkripte
- [ ] Keine automatisch startenden Medien (oder mit Stopp-Funktion)

#### Anpassbar

- [ ] Semantisch korrektes HTML (header, nav, main, footer Elemente)
- [ ] Überschriftenhierarchie korrekt (h1, h2, h3 - keine Ebene überspringen)
- [ ] Listen als ul, ol, dl formatiert
- [ ] Tabellen haben th für Header-Zellen
- [ ] Formulare haben label mit for-Attribut
- [ ] Zusammengehörige Formularfelder in fieldset mit legend

#### Unterscheidbar

- [ ] Farbkontrast mindestens 4.5:1 für normalen Text
- [ ] Farbkontrast mindestens 3:1 für großen Text (ab 18pt oder 14pt fett)
- [ ] Informationen nicht nur durch Farbe vermittelt
- [ ] Text auf 200% zoombar ohne Verlust
- [ ] Kein Text in Bildern (außer Logos)

---

### 2. Bedienbar (Operable)

Alle Funktionen müssen bedienbar sein.

#### Tastaturzugänglich

- [ ] Alle Funktionen per Tastatur erreichbar
- [ ] **Skip-Link** ("Zum Inhalt springen") vorhanden
- [ ] Tab-Reihenfolge logisch
- [ ] Kein Tastaturfokus-Trap (Fokus kann Element verlassen)
- [ ] Keine Zeiteinteilung bei Tastaturnutzung erforderlich

#### Fokus-Management

- [ ] Fokus-Indikator sichtbar (:focus-visible Styling)
- [ ] Fokus wird bei Modal-Öffnung in Modal verschoben
- [ ] Focus-Trap in Modals/Dialogen
- [ ] Fokus kehrt nach Modal-Schließung zum Auslöser zurück
- [ ] Escape-Taste schließt Modals/Dropdowns

#### Ausreichend Zeit

- [ ] Zeitlimits können verlängert/deaktiviert werden
- [ ] Bewegende Inhalte können pausiert werden
- [ ] Keine Inhalte, die mehr als 3x pro Sekunde blinken

#### Navigierbar

- [ ] Seitentitel beschreibt Inhalt (title-Element)
- [ ] Mehrere Navigationsmethoden (Menü + Suche oder Sitemap)
- [ ] Link-Texte beschreiben Ziel (nicht "hier klicken")
- [ ] Gleichbleibende Navigation auf allen Seiten

---

### 3. Verständlich (Understandable)

Inhalte und Bedienung müssen verständlich sein.

#### Lesbar

- [ ] Seitensprache definiert (html lang="de")
- [ ] Fremdsprachige Wörter/Abschnitte gekennzeichnet (lang-Attribut)
- [ ] Abkürzungen erklärt (abbr-Element mit title)
- [ ] Fachbegriffe erklärt oder Glossar vorhanden

#### Vorhersehbar

- [ ] Keine unerwarteten Kontextwechsel bei Fokus
- [ ] Keine unerwarteten Kontextwechsel bei Eingabe
- [ ] Konsistente Navigation
- [ ] Konsistente Benennung gleicher Funktionen

#### Eingabehilfe

- [ ] Fehlermeldungen identifizieren das Problem klar
- [ ] Fehlermeldungen sind mit aria-describedby verknüpft
- [ ] Pflichtfelder sind gekennzeichnet (nicht nur visuell)
- [ ] Pflichtfeld-Kennzeichnung für Screenreader lesbar
- [ ] Korrekturvorschläge bei Fehlern
- [ ] Bestätigung vor kritischen Aktionen

---

### 4. Robust

Inhalte müssen mit verschiedenen Technologien nutzbar sein.

#### Kompatibel

- [ ] Valides HTML (keine Parsing-Fehler)
- [ ] Eindeutige IDs auf der Seite
- [ ] ARIA korrekt verwendet (falls eingesetzt)
- [ ] Custom Components haben korrekte Rollen und Zustände
- [ ] Dynamische Inhalte mit Live-Regions (aria-live)
- [ ] Status-Änderungen werden angekündigt

---

## HTML-spezifische Anforderungen

Basierend auf Checkliste Landeskompetenzzentrum Barrierefreie IT Hessen.

| Anforderung                    | Beispiel                          | Status |
| ------------------------------ | --------------------------------- | ------ |
| Seitensprache definiert        | `<html lang="de">`                | [ ]    |
| Fremdsprachige Wörter markiert | `<span lang="en">Workflow</span>` | [ ]    |
| Zitate korrekt ausgezeichnet   | blockquote und cite Elemente      | [ ]    |
| Aufzählungen als Listen        | ul, ol, dl Elemente               | [ ]    |
| Labels für Formulare           | `<label for="feldname">`          | [ ]    |
| Formulargruppen                | fieldset mit legend               | [ ]    |
| Überschriften-Hierarchie       | h1, h2, h3 ohne Lücken            | [ ]    |
| Abkürzungen definiert          | `<abbr title="...">`              | [ ]    |
| Sprungmarken vorhanden         | Skip-Links                        | [ ]    |

---

## Technische Implementierung

### Skip-Link

Am Anfang des body-Elements:

```tsx
<a href="#main-content" className="skip-link">
  Zum Inhalt springen
</a>

<main id="main-content">
  {/* Hauptinhalt */}
</main>
```

CSS:

```css
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 9999;
}

.skip-link:focus {
  left: 50%;
  transform: translateX(-50%);
  top: 10px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
}
```

### Formular-Fehler mit aria-describedby

```tsx
<label htmlFor="email">E-Mail</label>
<input
  id="email"
  aria-describedby={error ? "email-error" : undefined}
  aria-invalid={!!error}
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

### Pflichtfeld-Kennzeichnung

```tsx
{/* Visuell UND für Screenreader */}
<span aria-hidden="true">*</span>
<span className="sr-only">(Pflichtfeld)</span>
```

### Live-Regions für Status-Updates

```tsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### Focus-Trap für Modals

```tsx
// Mit React: @react-aria/focus oder focus-trap-react
import { FocusTrap } from '@headlessui/react';

<FocusTrap>
  <dialog>{/* Modal-Inhalt */}</dialog>
</FocusTrap>;
```

---

## Test-Tools

### Automatisierte Tests

| Tool         | URL                                                                                                         | Kostenlos |
| ------------ | ----------------------------------------------------------------------------------------------------------- | --------- |
| WAVE         | [wave.webaim.org](https://wave.webaim.org/)                                                                 | Ja        |
| axe DevTools | [Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd) | Ja        |
| Lighthouse   | Chrome DevTools (F12)                                                                                       | Ja        |
| Pa11y        | [pa11y.org](https://pa11y.org/)                                                                             | Ja        |

### Manuelle Tests

- [ ] **Tastatur-Test**: Komplette Seite nur mit Tab, Enter, Escape bedienen
- [ ] **Screenreader-Test**: Mit VoiceOver (Mac) oder NVDA (Windows)
- [ ] **Zoom-Test**: Auf 200% zoomen, prüfen ob alles nutzbar
- [ ] **Kontrast-Test**: Mit Browser DevTools oder Contrast Checker

### Professionelle Prüfung

- **BITV-Test**: [bitvtest.de](https://www.bitvtest.de/) (offizieller deutscher Test)
- **BFIT-Bund**: Bundesfachstelle Barrierefreiheit

---

## Quellen und weiterführende Links

### Gesetzliche Grundlagen

- [Bundesfachstelle Barrierefreiheit - BFSG](https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/Barrierefreiheitsstaerkungsgesetz/barrierefreiheitsstaerkungsgesetz_node.html)
- [BFSG-Gesetz.de - Übersicht](https://bfsg-gesetz.de/)
- [IHK München - Barrierefreiheitsstärkungsgesetz](https://www.ihk-muenchen.de/de/Service/Recht-und-Steuern/Werbung-Fairer-Wettbewerb/barrierefreiheitsstaerkungsgesetz/)

### Technische Standards

- [WCAG 2.1 Richtlinien (W3C)](https://www.w3.org/TR/WCAG21/)
- [WCAG 2.2 Richtlinien (W3C)](https://www.w3.org/TR/WCAG22/)
- [EN 301 549 (PDF)](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf)

### Praxishilfen

- [Aktion Mensch - Barrierefreie Website](https://www.aktion-mensch.de/inklusion/barrierefreiheit/barrierefreie-website/gesetzliche-pflichten)
- [Aktion Mensch - Einfach für Alle](https://www.einfach-fuer-alle.de/)
- [VERDURE - BFSG 2025 Übersicht](https://www.verdure.de/magazin/strategie/barrierefreiheitsstarkungsgesetz-websites-2025-bfsg-bitv-wcag/)
- [UserWay - BFSG Checkliste](https://userway.org/de/blog/bfsg-2025/)

### Behörden und Institutionen

- [Landeskompetenzzentrum Barrierefreie IT Hessen](https://lbit.hessen.de/)
- [Barrierefreiheit Dienstekonsolidierung Bund](https://www.barrierefreiheit-dienstekonsolidierung.bund.de/)
- [BIK - Barrierefrei informieren und kommunizieren](https://bik-fuer-alle.de/)

### Testing

- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [axe Accessibility Testing](https://www.deque.com/axe/)
- [BITV-Test](https://www.bitvtest.de/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

---

## Changelog

| Datum      | Änderung                  |
| ---------- | ------------------------- |
| 2025-01-08 | Initiale Version erstellt |
