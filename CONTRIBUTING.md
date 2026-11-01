# Zu FRAME beitragen

Fehlerberichte, Dokumentationskorrekturen und Pull Requests sind willkommen. Die Oberfläche und die meisten Anleitungen sind auf Deutsch; Code und Testnamen sind überwiegend auf Englisch.

## Lokal starten

Voraussetzung ist Node.js ab Version 22.12.

```sh
git clone https://github.com/pixelhalunke/Frame-Siebdruck.git
cd Frame-Siebdruck
npm ci
npm run dev
```

Die App läuft unter `http://127.0.0.1:5175/`. Motive und Projekte bleiben im Browser auf dem eigenen Gerät. Projektdateien lassen sich als `.frame.json` sichern.

## Änderungen prüfen

```sh
npm test
npm run lint
npm run build
```

Der Build enthält die TypeScript-Prüfung. GitHub führt dieselben Schritte für Pushes und Pull Requests aus. Bei Änderungen an Druckgeometrie oder Exporten bitte Maße, Löcher, Überlagerungen und Passkreuze mitprüfen. Die [Druckprüfung](docs/PRINT_VERIFICATION.md) erklärt den Test auf echtem Papier.

Bei Änderungen an der Oberfläche bitte Tastaturbedienung, sichtbaren Fokus, verständliche Beschriftungen und schmale Ansichten prüfen. Automatische Barrierefreiheitsprüfungen sind lokal über `/audit.html` verfügbar.

## Fehler melden

Ein [Fehlerbericht](https://github.com/pixelhalunke/Frame-Siebdruck/issues/new) sollte enthalten:

- Schritte zum Nachstellen sowie erwartetes und tatsächliches Ergebnis.
- Browser, Betriebssystem und FRAME-Version.
- Eine kleine neutrale Beispieldatei, falls zum Nachstellen nötig.

Bitte keine vertraulichen Motive, eigenen Schriften ohne Weitergaberechte oder persönlichen Daten hochladen. Vertrauliche Sicherheitsprobleme bitte nach [SECURITY.md](SECURITY.md) melden.

## Pull Requests vorbereiten

Eine Änderung sollte ein klar beschriebenes Problem lösen. Erkläre kurz, was sich ändert und wie du es geprüft hast. Ergänze bei fachlichen Änderungen einen Test, der das betroffene Verhalten absichert. Beispiele und Testdaten müssen selbst erstellt oder unter einer passenden Lizenz weitergebbar sein.

Der eigene Projektcode steht unter der [MIT-Lizenz](LICENSE). Beiträge zum eigenen Projektcode werden unter derselben Lizenz aufgenommen. Fremdkomponenten behalten ihre jeweiligen Lizenzbedingungen.

Nach Änderungen an Abhängigkeiten `npm run notices` ausführen und die aktualisierten Dritthinweise mit aufnehmen. Generierte Builds, lokale Prüfaufnahmen und private Testmotive gehören nicht ins Repository.

Die Historie wurde zur Vorbereitung der Veröffentlichung neu begonnen. Falls du bereits einen älteren Klon hast, klone das Repository erneut. Verbinde den alten Verlauf nicht per Merge mit dem neuen Stand, da so entfernte Inhalte zurückkehren könnten.
