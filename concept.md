# Produktkonzept

## Grundidee

Der RC Kalender PoC validiert ein neues, modernes Frontend für den bestehenden Veranstaltungskalender von Regnum Christi.

Das Backend existiert bereits und ist **nicht Teil dieses PoC**. Die Frontend-App soll später im Wesentlichen zwei Backend-Interaktionen haben:

1. veröffentlichte Veranstaltungen lesen,
2. Anmeldungen an das bestehende Backend senden.

Bis die reale Schnittstelle bekannt ist, verwendet der PoC lokale Demo-Daten mit derselben fachlichen Struktur.

## Zielgruppe

Menschen, die öffentliche Veranstaltungen von Regnum Christi finden, verstehen und sich dafür anmelden möchten.

Der erste PoC konzentriert sich auf die öffentliche Nutzersicht. Interne Administration, Veranstaltungsanlage, Rechnungen und Datenpflege liegen außerhalb des Frontends.

## Kernfunktionen

Aktueller PoC:

- responsive Veranstaltungsliste,
- realistisch aufgebaute Demo-Veranstaltungen auf Basis öffentlich sichtbarer RC-Termine,
- Volltextsuche,
- Filter nach Kategorie und Land,
- optionaler Filter auf Veranstaltungen mit offener Anmeldung,
- sichtbarer Anmeldestatus,
- Preis, Zielgruppe, Termin und Ort direkt in der Liste,
- installierbare PWA.

Nächste fachliche Schritte:

- Veranstaltungsdetailseite,
- Anmeldeformular,
- Anbindung an die bestehende Backend-Schnittstelle.

## Zentrale Abläufe

### Veranstaltungen finden

1. Nutzer öffnet den Kalender.
2. Das Frontend lädt die Veranstaltungen.
3. Nutzer sucht oder filtert.
4. Die passenden Veranstaltungen werden als Karten dargestellt.
5. Nutzer öffnet die Details einer Veranstaltung.

Im aktuellen PoC kommen die Daten aus `src/data/events.ts`. Später wird diese Quelle durch das Backend ersetzt.

### Anmeldung

Zielbild:

1. Nutzer öffnet eine Veranstaltung.
2. Nutzer startet „Anmelden“.
3. Frontend erfasst die vom Backend erwarteten Angaben.
4. Frontend sendet die Anmeldung an das bestehende Backend.
5. Backend liefert Ergebnis bzw. Fehler zurück.
6. Frontend zeigt das Ergebnis verständlich an.

Der konkrete Request-Vertrag ist noch nicht bekannt und wird daher im aktuellen PoC nicht vorgetäuscht.

## Abgrenzung

Nicht Bestandteil des PoC:

- eigenes Backend,
- Event-Administration,
- Kontaktverwaltung,
- Rechnungslogik,
- Zahlungsabgleich,
- Bestätigungsschreiben,
- Synchronisation zwischen mehreren Backend-Systemen,
- Nachbau historischer Dynamics-/Webdatenbank-Altlasten.

Der PoC soll bewusst ein frisches Frontend für das bestehende Backend sein.

## Demo-Daten

Die Demo-Daten basieren auf öffentlich sichtbaren Veranstaltungen des bestehenden RC-Webkalenders, Stand 19.09.2026.

Personenbezogene Kontaktinformationen wurden nicht übernommen. Kategorien und Kurzbeschreibungen dürfen für den PoC vereinfacht werden, solange die zugrunde liegenden Veranstaltungsdaten realistisch bleiben.

## Offene Annahmen

- Wie sieht der tatsächliche API-Vertrag zum Lesen der Veranstaltungen aus?
- Wie sieht der Request/Response-Vertrag für Anmeldungen aus?
- Welche Felder sind für eine Anmeldung verpflichtend?
- Welche Anmeldestatus liefert das Backend zurück?
- Welche Filter sollen für den ersten echten Nutzertest sichtbar sein?
