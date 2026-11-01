# Veröffentlichung und Lizenzen

Stand: 1. November 2026. FRAME steht unter MIT in einem eigenständigen öffentlichen [GitHub-Repository](https://github.com/pixelhalunke/Frame-Siebdruck) bereit.

## Vorbereitet

- Neutrale eigene Testmuster ersetzen private Referenzmotive. Zugehörige Quelldateien, Exporte, Herkunftsdateinamen und Prüfaufnahmen sind entfernt. Feine Punkte, Löcher, Sprenkel und die Auswahl vieler Regionen bleiben automatisiert geprüft.
- README, Bildimport-Anleitung und Entwicklungsdokumentation beschreiben die Funktionen ohne private Referenzprojekte.
- Der eigene Projektcode steht unter der [MIT-Lizenz](../LICENSE); `package.json` und die Lockdatei verwenden das SPDX-Kürzel `MIT`. Bibliotheken und Schriften behalten ihre eigenen Lizenzen.
- Das neue Repository beginnt mit einem sauberen Startcommit. Sein Verlauf enthält keine früheren Referenzmotive oder privaten Autoradressen. Das bisherige Repository und eine zusätzliche lokale Sicherung bleiben privat und werden nicht in das neue Repository übertragen.
- [CONTRIBUTING.md](../CONTRIBUTING.md) erklärt Einrichtung, Fehlerberichte, Pull Requests und Prüfungen. [SECURITY.md](../SECURITY.md) beschreibt vertrauliche Sicherheitsmeldungen.
- GitHub Actions führt Installation, Tests, Codeprüfung und Produktionsbuild aus. Ein zusätzlicher Vergleich erkennt veraltete Dritthinweise.
- `npm run notices` sammelt die vollständigen Lizenztexte der installierten Laufzeitabhängigkeiten einschließlich ihrer Unterabhängigkeiten und der lokalen Fonts. `npm run build` aktualisiert sie automatisch; Vite kopiert sie als `THIRD_PARTY_NOTICES.txt` in den Build. Die Projektlizenz wird zusätzlich als `LICENSE.txt` ausgeliefert.
- Lokale Prüfaufnahmen, `.env`-Dateien, installierte Abhängigkeiten und Build-Ausgaben werden nicht neu eingecheckt. `.env.example` darf als Vorlage versioniert werden.

## Veröffentlichung

Das öffentliche Repository wurde unabhängig neu angelegt und mit dem bereinigten Projektstand befüllt. Es ist kein Fork des bisherigen Repositorys. Der bisherige Bestand wurde als privates Archiv erhalten. Alte Commits und deren zwischengespeicherte Ansichten gehören damit nicht zum neuen Repository.

Vertrauliche Sicherheitsmeldungen sind über GitHub aktiviert; siehe [SECURITY.md](../SECURITY.md). Alte lokale Klone sollten ersetzt werden, damit entfernte Inhalte nicht erneut in den Verlauf gelangen. Neue Klone verwenden weiterhin dieselbe Adresse:

```sh
git clone https://github.com/pixelhalunke/Frame-Siebdruck.git
```

`"private": true` in `package.json` verhindert versehentliche npm-Veröffentlichungen. Es schränkt die GitHub-Sichtbarkeit oder eine separat gewählte Open-Source-Lizenz nicht ein und bleibt für diese Web-App sinnvoll.

## Fremdkomponenten und Beispiele

Die direkten Laufzeitabhängigkeiten deklarieren MIT, ISC, Apache-2.0, BSD-3-Clause, Unlicense oder OFL-1.1. Die Projektlizenz ersetzt diese Lizenzen nicht. Space Grotesk bleibt unter OFL-1.1, die DejaVu-Schriften behalten die mitgelieferten Lizenzbedingungen. Ihre vollständigen Texte stehen außerdem unter `public/fonts/`.

Die Hinweise erfassen auch indirekte Laufzeitabhängigkeiten. Das npm-Paket `react-remove-scroll-bar@2.3.8` enthält trotz MIT-Deklaration keinen Lizenztext; der Originaltext aus dem offiziellen Quellrepository liegt deshalb zusätzlich mit Quellenangabe unter `scripts/licenses/`. Bei einem Versionswechsel muss diese Zuordnung erneut geprüft werden. Entwicklungstools behalten die Lizenzdateien in ihren npm-Paketen; sie werden nicht mit der Web-App ausgeliefert.

Der geometrische Demonstrator entsteht in `src/features/editor/demo.ts`. Die Texturmuster entstehen in `src/test/helpers/texture-fixture.ts`. Neue Beispieldateien dürfen nur aufgenommen werden, wenn ihre Weitergabe erlaubt ist.

## Technische Prüfung

```sh
npm ci
npm test
npm run lint
npm run build
npm audit
```

Die Prüfung der installierten Abhängigkeiten am 1. November 2026 meldete keine bekannten Sicherheitslücken. Das ist eine Momentaufnahme und sollte vor einem Release erneut geprüft werden. Physische Drucktests, echte Screenreader-Tests, nativer Browserzoom und einzelne Clipboard-Kombinationen bleiben wie in der README beschrieben offen.
