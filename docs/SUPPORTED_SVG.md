# Unterstützte SVGs in FRAME 0.2

Filmexport und Farbtrennung in FRAME arbeiten ausschließlich mit echter Vektorgeometrie. JPEG, PNG, WebP und weitere vom Browser lesbare Bilder können separat importiert und vorher vektorisiert werden, siehe [Bildimport](BILDIMPORT.md). Der ursprüngliche SVG-Text bleibt im Projekt erhalten, wird aber niemals direkt in die Seite eingesetzt. Vorschau und Filmexport verwenden dieselben abgeleiteten Pfade.

| Funktion | Unterstützung |
| --- | --- |
| path, rect, abgerundetes rect, circle, ellipse | Ja |
| polygon, polyline, line | Ja; geschlossene Füllungen / explizite Konturen |
| Deckende Flächen, identische Farben | Ja; RGB, Hex und benannte CSS-Farben normalisiert |
| Konturen | Ja; butt/round/square, miter/round/bevel, Breite und miter limit; Expansion vor Transformation |
| Gruppen / Reihenfolge | Ja; unabhängig von späterer Zahl der Filme |
| Transformationen | translate, scale, rotate, matrix, skewX, skewY, verschachtelt |
| Compound-Pfade / Löcher | nonzero und evenodd; boolesche Ergebnisse als evenodd |
| Styles | Vererbte Präsentationsattribute und erlaubte Inline-Styles; currentColor |
| Sichtbarkeit | display none, visibility hidden/collapse, opacity 0; abweichende visibility eines Kindes wird berücksichtigt |
| viewBox | Feste Maße, xMidYMid meet oder none; Wurzel-Viewport begrenzt, overflow visible berücksichtigt |
| Maße | mm, cm, in, pt, pc, px; 96 px = 1 inch. Prozent-/relative Größen abgewiesen |
| Text-Werkzeug | Mitgelieferte Space Grotesk Bold, lateinische Zeichen; sofortige Pfadumwandlung |
| SVG-Text / fremde Fonts | Vor Import in Pfade umwandeln |
| Verläufe, Teiltransparenz, Filter, eingebettete Bilder in SVG | Abgewiesen mit Erklärung |
| clipPath, mask, use, symbol, verschachtelte svg | Abgewiesen; vorher als einfache Pfade auflösen |
| CSS-Stylesheets, CSS-Transformationen | Abgewiesen; Darstellung über Attribute/Inline-Styles exportieren |
| Strichmuster, Marker, non-scaling-stroke, paint-order | Abgewiesen |
| Skripte, Event-Handler, foreignObject, externe Referenzen | Abgewiesen; keine Ausführung / externen Abrufe |
| XML-DTD, Entities, externe Stylesheets | Abgewiesen |

## Physische Maße und Zuordnung

Die Editor-Breite/Höhe bezieht sich auf die importierte SVG-Zeichenfläche einschließlich Leerraum. Unter der Vorschau und im Druckdialog steht zusätzlich die tatsächliche sichtbare Fläche. Eine 100 × 100 mm große Füllung wird im 100-%-Export 100 × 100 mm groß. FRAME passt Motive nie automatisch an einen Druckbogen an.

Knockout wird zuerst aus sichtbaren Quellflächen und deren Reihenfolge berechnet. Anschließend werden diese Flächen Druckfarben zugewiesen. Eine Zusammenlegung vereinigt die bereits sichtbaren Regionen. Das Deaktivieren einer Druckfarbe lässt keine darunterliegende Farbe wieder erscheinen.

## Bibliotheken / Lizenzen

| Bibliothek | Einsatz | Lizenz |
| --- | --- | --- |
| ImageTracerJS 1.2.6 | Nachzeichnen vorbereiteter Farbregionen im Web Worker | Unlicense / Public Domain |
| Skia PathKit 1.0.0 | Boolesche Vektoroperationen und Konturen | BSD-3-Clause |
| svgpath 2.6.0 | Pfadnormalisierung und affine Transformationen | MIT |
| pdf-lib 1.17.1 | Physisch dimensionierte PDF-Vektorpfade | MIT |
| OpenType.js 2.0.0 | Auslesen der Schriftkonturen | MIT |
| Space Grotesk | Oberfläche und Textwerkzeug | SIL OFL; `public/fonts/OFL.txt` |
| React, Vite, Tailwind, Radix, colord, idb, zod | Oberfläche / Infrastruktur | MIT |
| Lucide | Icons | ISC |

PathKit verwendet float32-Kurven; FRAME behauptet keine unendliche Präzision. Zielbereich sind A4/A3-Drucke mit 0,01 mm digitaler Maßtoleranz. Pfadkommandos werden präziser als mit dem Standardserializer gespeichert; Kontur-Conics werden in kubische Segmente umgerechnet. Tests sichern typische Konturen und Kurvenschnittmengen. Ungewöhnliche Grafiken sollten mit den Maskenvorschauen geprüft werden.

Primärquellen: [ImageTracerJS](https://github.com/jankovicsandras/imagetracerjs), [PathKit-API](https://skia.googlesource.com/skia/+/1321a3d/site/user/modules/pathkit.md), [pdf-lib](https://pdf-lib.js.org/), [OpenType.js](https://github.com/opentypejs/opentype.js).

## Zwischenablage-Matrix

| Quelle / Ziel | Stand |
| --- | --- |
| SVG-Markup → Codex-Browser, dokumentweites Paste | Tatsächlich geprüft, erfolgreich |
| SVG-Markup → explizites SVG-Code-Feld | Tatsächlich geprüft, erfolgreich |
| image/svg+xml vor text/plain | Automatischer MIME-Test bestanden |
| PNG-Bild ohne SVG | Dateiübergabe automatisch geprüft; echtes Bild-Paste im Codex-Browser erfolgreich |
| Figma Copy as SVG → Chrome / Safari auf macOS | Manuell offen |
| Illustrator SVG-Clipboard → Chrome / Safari auf macOS | Manuell offen |
| SVG-Datei-Fallback | Parser und Datei-Pipeline implementiert; bekannte Fixture-Dateien geprüft |

Figma: „Copy as SVG“ verwenden. Illustrator: SVG-Zwischenablage aktivieren oder SVG exportieren, Schrift in Pfade umwandeln, keine DTD/externen Ressourcen verwenden. Normales Kopieren garantiert kein für Browser zugängliches SVG.
