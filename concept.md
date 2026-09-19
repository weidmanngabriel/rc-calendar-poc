# Produktkonzept

## Grundidee

Der RC Kalender PoC validiert ein neues, modernes Frontend für den bestehenden Veranstaltungskalender von Regnum Christi.

Das Backend existiert bereits und ist **nicht Teil dieses PoC**. Die Frontend-App soll später im Wesentlichen zwei Backend-Interaktionen haben:

1. veröffentlichte Veranstaltungen lesen,
2. Anmeldungen an das bestehende Backend senden.

Bis die reale Schnittstelle bekannt ist, verwendet der PoC lokale Demo-Daten und simuliert das erfolgreiche Absenden einer Anmeldung.

## Zielgruppe

Menschen, die öffentliche Veranstaltungen von Regnum Christi finden, verstehen und sich dafür anmelden möchten.

Der erste PoC konzentriert sich auf die öffentliche Nutzersicht. Interne Administration, Veranstaltungsanlage, Rechnungen und Datenpflege liegen außerhalb des Frontends.

## Kernfunktionen

Aktueller PoC:

- kompakte, responsive Veranstaltungsliste,
- realistisch aufgebaute Demo-Veranstaltungen auf Basis öffentlich sichtbarer RC-Termine,
- Volltextsuche,
- Filter nach Kategorie und Land,
- Filter auf Veranstaltungen mit offener Anmeldung,
- sichtbarer Anmeldestatus,
- Preis, Zielgruppe, Termin und Ort direkt in der Liste,
- inline aufklappbare Veranstaltungsdetails,
- Deep Links auf aufgeklappte Veranstaltungen über den Query-Parameter `event`,
- mehrstufiger Anmelde-Flow,
- optionale lokale Speicherung bereits eingegebener Personen,
- installierbare PWA.

## Veranstaltungsansicht

Die Veranstaltungsliste ist bewusst deutlich kompakter als eine klassische Kartenansicht. Ziel ist, dass mehrere Veranstaltungen gleichzeitig sichtbar sind und ein schneller Überblick möglich ist.

Ein Klick auf eine Veranstaltung klappt Details direkt innerhalb der Gesamtliste auf. Die Liste bleibt damit als Kontext erhalten und kann weiter gescrollt werden.

Die aufgeklappte Ansicht zeigt derzeit die verfügbaren Demo-Daten:

- Beschreibung,
- Termin und Uhrzeit,
- Veranstaltungsort,
- Zielgruppen,
- Preis,
- Anmeldestatus.

## Anmelde-Flow

### 1. Teilnehmer auswählen

Der Nutzer legt fest:

- Anzahl Erwachsene,
- Anzahl Kinder / Minderjährige.

Eine minderjährige Person ist fachlich ein Kind. Maßgeblich ist das Alter zum Beginn der Veranstaltung.

Es dürfen mehrere Erwachsene und mehrere Kinder angemeldet werden. Eine Anmeldung darf auch ausschließlich Kinder enthalten.

Wenn Kinder angemeldet werden, muss ein Erziehungsberechtigter angegeben sein. Dieser kann:

- selbst als Erwachsener an der Veranstaltung teilnehmen oder
- nur als Erziehungsberechtigter hinterlegt werden, ohne Teilnehmer zu sein.

### 2. Personendaten

Für erwachsene Teilnehmer und einen separat erfassten Erziehungsberechtigten werden aktuell folgende Pflichtfelder erfasst:

- Vorname,
- Nachname,
- Geburtsdatum,
- E-Mail,
- Straße und Hausnummer,
- PLZ,
- Ort,
- Land.

Für Kinder / Minderjährige:

- Vorname,
- Nachname,
- Geburtsdatum,
- E-Mail.

Für Kinder wird standardmäßig die E-Mail des Erziehungsberechtigten übernommen. Über „Andere E-Mail-Adresse verwenden“ kann stattdessen eine eigene Adresse eingegeben werden.

Die Adressfelder sind bewusst international gehalten. Der PoC unterstützt insbesondere Deutschland, Österreich, Schweiz, Italien und Luxemburg und erzwingt keine deutsche PLZ-Struktur.

### 3. Datenschutz und lokale Speicherung

Die Datenschutzzustimmung ist für die Anmeldung erforderlich.

Optional können eingegebene Personendaten auf dem Gerät gespeichert werden. Im PoC erfolgt dies ausschließlich lokal im Browser über `localStorage`.

Bei späteren Anmeldungen können gespeicherte Personen über ein Dropdown ausgewählt und deren Felder vorbefüllt werden.

Die historische Borlabs-Cookie-Integration wird im PoC nicht nachgebaut. Ob und wie eine Einwilligung zur lokalen Speicherung im Produktivsystem umgesetzt werden muss, wird später separat entschieden.

### 4. Prüfung und Absenden

Vor dem endgültigen Absenden zeigt der PoC eine Zusammenfassung:

- Veranstaltung,
- Erwachsene,
- Kinder,
- Erziehungsberechtigter,
- Kontaktdaten.

Der Button „Anmeldung absenden“ ruft aktuell nur eine lokale Service-Abstraktion auf und simuliert eine erfolgreiche Backend-Antwort.

### 5. Bestätigung

Nach erfolgreichem Fake-Submit erscheint eine Bestätigungsseite mit dem Hinweis, dass im späteren Produkt eine Bestätigungs-E-Mail folgt. Von dort geht es zurück zum Kalender.

## Visuelle Orientierung

Der PoC orientiert sich an der Regnum-Christi-Markenwelt, ohne die bestehende Webseite 1:1 zu kopieren:

- Lato als primäre UI-Schrift,
- Merriweather als kontrastierende Serifenschrift für Überschriften,
- Regnum-Christi-Rot als sparsame Akzentfarbe,
- überwiegend weiße und neutrale Flächen,
- kompakte, funktionale Darstellung statt großer Marketing-Karten.

## Backend-Zielbild

Der konkrete Backend-Vertrag ist noch offen. Das aktuelle Altsystem verwendet möglicherweise SOAP/OData oder eine andere bestehende Schnittstelle; für den PoC wird hierzu keine Annahme fest codiert.

Das Frontend ruft stattdessen eine kleine interne Funktion auf:

`submitRegistration(registration)`

Später kann diese Implementierung auf einen bestehenden oder neuen API-Endpunkt zeigen, ohne den UI-Flow neu zu bauen.

## Abgrenzung

Nicht Bestandteil des PoC:

- eigenes Backend,
- Event-Administration,
- Kontaktverwaltung,
- Rechnungslogik,
- Zahlungsabgleich,
- Bestätigungsschreiben,
- Synchronisation zwischen mehreren Backend-Systemen,
- Nachbau historischer Dynamics-/Webdatenbank-Altlasten,
- produktive Cookie-/Consent-Integration.

## Demo-Daten

Die Demo-Daten basieren auf öffentlich sichtbaren Veranstaltungen des bestehenden RC-Webkalenders, Stand 19.09.2026.

Personenbezogene Kontaktinformationen wurden nicht übernommen. Kategorien und Kurzbeschreibungen dürfen für den PoC vereinfacht werden, solange die zugrunde liegenden Veranstaltungsdaten realistisch bleiben.

## Offene Annahmen

- Wie sieht der tatsächliche API-Vertrag zum Lesen der Veranstaltungen aus?
- Wie sieht der Request/Response-Vertrag für Anmeldungen aus?
- Welche Backend-Fehler und Statuswerte müssen im Frontend behandelt werden?
- Welche der aktuell im Altsystem sichtbaren längeren Veranstaltungsinhalte stehen über das Backend zur Verfügung?
- Wie soll die lokale Personenspeicherung datenschutzrechtlich im Produktivsystem umgesetzt werden?
