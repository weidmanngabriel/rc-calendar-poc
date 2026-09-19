# Architektur

## Überblick

Die Anwendung ist eine rein clientseitige React-App mit TypeScript und Vite. Der Einstieg liegt in `src/main.tsx`, die Kalender- und Anmeldeoberfläche in `src/App.tsx` und das globale Styling in `src/styles.css`.

Der PoC bildet ausschließlich das Frontend eines Veranstaltungskalenders ab. Ein eigenes Backend wird nicht eingeführt.

## Datenzugriff

Aktuell verwendet die App lokale Demo-Daten aus:

`src/data/events.ts`

Das dort definierte `CalendarEvent`-Modell bildet die für das Frontend benötigten Veranstaltungsdaten ab, unter anderem:

- Titel und ID,
- Beginn/Ende,
- Ort,
- Zielgruppen,
- Kategorie,
- Preis,
- Anmeldestatus,
- Kurzbeschreibung,
- optionaler Veranstaltungsort.

Die Demo-Daten basieren auf öffentlich sichtbaren RC-Veranstaltungen und enthalten bewusst keine personenbezogenen Kontaktdaten.

Sobald die bestehende Backend-Schnittstelle bekannt ist, soll die lokale Datenquelle durch eine kleine Zugriffsschicht ersetzt werden. Das Frontend benötigt fachlich nur:

1. Veranstaltungen lesen,
2. Anmeldungen senden.

Backend-Fachlogik wie Kapazität, Warteliste, Kontaktzuordnung oder Rechnungsprozesse gehört nicht in den Browser.

## Registrierung

`src/registration.ts` bildet eine sehr kleine Grenze zum späteren Backend.

Aktuell implementiert:

`submitRegistration(payload)`

Die Funktion wartet im PoC kurz und liefert anschließend einen Fake-Erfolg zurück. Der UI-Code kennt dadurch keine Annahmen über SOAP, OData oder einen späteren REST-Endpunkt.

Das Payload-Modell enthält:

- Event-ID,
- erwachsene Teilnehmer,
- minderjährige Teilnehmer,
- optionalen Erziehungsberechtigten,
- Datenschutzzustimmung.

## Frontend-Struktur

`src/App.tsx` enthält aktuell:

- Veranstaltungsliste,
- Volltextsuche,
- Filter nach Kategorie und Land,
- Filter auf offene Anmeldung,
- kompakte Event-Zeilen,
- inline aufklappbare Detailansicht,
- Deep-Link-Zustand über `?event=<id>`,
- mehrstufigen Anmelde-Flow,
- dynamische Formulare für Erwachsene und Kinder,
- Erziehungsberechtigtenlogik,
- Zusammenfassung und Fake-Erfolg,
- leeren Ergebniszustand.

Es wird bewusst kein zusätzliches State-Management oder UI-Framework verwendet.

## Lokale Personenspeicherung

Optional können Personendaten für spätere Anmeldungen lokal im Browser gespeichert werden.

Technisch nutzt der PoC:

`localStorage['rc-calendar-saved-people']`

Diese Speicherung ist reine PoC-Komfortfunktion. Sie ist keine serverseitige Identität und kein Ersatz für ein Datenschutz-/Consent-Konzept.

## Internationale Adressen

Das Formular verwendet keine länderspezifische PLZ-Validierung. Dadurch werden unterschiedliche Formate aus Deutschland, Österreich, Schweiz, Italien, Luxemburg und weiteren Ländern nicht künstlich ausgeschlossen.

Die fachliche Unterscheidung zwischen Erwachsenen und Minderjährigen wird anhand des Alters am Startdatum der Veranstaltung geprüft.

## Design

Die Gestaltung orientiert sich an der offiziellen Regnum-Christi-Markenwelt:

- Lato als Primärschrift,
- Merriweather als sekundäre Kontrastschrift,
- RC-Rot `#941A2C` als Akzent,
- neutrale weiße/helle Flächen,
- Rot nicht großflächig, sondern primär für Interaktion und Hervorhebung.

Die Schriften werden aktuell über Google Fonts geladen. Falls die Produktion externe Font-Aufrufe vermeiden soll, kann später auf selbst gehostete oder System-Schriften umgestellt werden.

## PWA

`vite-plugin-pwa` erzeugt beim Produktionsbuild das Web-App-Manifest und den Service Worker. Die App verwendet feste App-Icons aus `public/` und ein `apple-touch-icon` für iOS.

`src/PullToRefresh.tsx` ergänzt auf Touch-Geräten ein eigenes Pull-to-Refresh.

Der Vite-Basispfad ist relativ (`./`). Dadurch funktioniert derselbe Build lokal und auf GitHub Pages im Repository-Unterpfad.

## Google Login

Die Template-Basis enthält weiterhin die technische Google-Login-Vorbereitung, sie wird in der aktuellen Kalenderoberfläche nicht benötigt.

Falls später Authentifizierung für einen Backend-Aufruf erforderlich wird, muss sie passend zur realen Backend-Schnittstelle bewertet werden. Die bisherige lokale Google-Profilverwaltung ist keine Backend-Autorisierung.

## Deployment

`.github/workflows/deploy.yml` baut die App bei Änderungen auf `main` und veröffentlicht ausschließlich `dist` über GitHub Pages.

GitHub Pages verwendet GitHub Actions als Veröffentlichungsquelle.

## Entwicklungsprinzipien

- Frontend bleibt klein und clientseitig.
- Keine Backend-Logik duplizieren.
- API-Verträge nicht erfinden; bis zur Klärung Demo-Daten/Fake-Submit verwenden.
- Alles im Browser als öffentlich einsehbar behandeln.
- Keine Secrets oder privaten Zugangsdaten im Repository.
- Mobile Nutzbarkeit hat denselben Stellenwert wie Desktop.
- Neue Libraries nur einführen, wenn sie einen klaren Produktnutzen haben.
