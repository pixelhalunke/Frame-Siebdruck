# FRAME

Eine lokale Werkbank, die Bilder und fertige SVG-Motive in schwarze Belichtungsfilme für den Siebdruck trennt. React + TypeScript; alle Motive bleiben auf deinem Gerät.

## Starten

Voraussetzung: Node.js 22.12 oder neuer (hier mit Node 24 geprüft).

```sh
npm ci
npm run dev
```

App: **http://127.0.0.1:5175/**. Der Port ist fest, damit lokale Projekte beim nächsten Start wieder verfügbar sind. Falls der Port schon belegt ist, öffne die bereits laufende FRAME-Instanz. Für Film-Downloads und Druckdialog die Adresse in Chrome oder Safari öffnen; der eingebettete Codex-Browser bestätigt Blob-Downloads nicht zuverlässig.

1. „Bild oder SVG öffnen“ wählen, eine Datei ablegen oder ein Bild mit Cmd/Ctrl+V einfügen. Für Bilder im Importdialog Farben, Hintergrund und Konturen einstellen; dann „Als Vektoren übernehmen“. Das bestehende SVG-Beispiel bleibt verfügbar.
2. Motivmaße, Position und Druckfarben einstellen. Jede Belichtungsmaske prüfen.
3. „Druckvorbereitung“ öffnen, Papier und Passkreuze wählen, PDF/SVG exportieren.
4. Mit tatsächlicher Größe / 100 % drucken. Vor der Belichtung Maße und Deckkraft prüfen.

Die Größe in den Motivfeldern beschreibt die SVG-Zeichenfläche. Der tatsächliche sichtbare Druckbereich steht zusätzlich unter der Vorschau. Nicht unterstützte Effekte werden mit einer Erklärung abgewiesen.

## Enthalten

- JPEG-/PNG-/WebP-Import mit lokaler Vektorisierung, 1–8 Druckfarben, Hintergrundentfernung, Fleckenfilter und Originalvergleich. Weitere vom Browser lesbare Bildformate werden ebenfalls angenommen.
- Raster-/Grunge-Stil mit erhaltenen Punkten, Löchern und Sprenkeln; automatische Stilempfehlung, zwei Hauptfarben, bis 4 Megapixel Verarbeitung.
- Vollbildeditor für Vektorflächen: Rahmen ziehen, mehrere Bereiche auswählen und gemeinsam löschen, lokale Rückgängig-/Wiederholen-Schritte, Farbfilter und bis 800 % Detailansicht. Vor und nach dem Bildimport verfügbar.
- Datei-/Clipboard-/Code-Import, sichere SVG-Validierung.
- Sichtbare Druckfarben statt Quell-Layer; geometrisches Knockout, offene Löcher, expandierte Konturen.
- Motive bewegen, skalieren, drehen, zentrieren, anordnen, ein-/ausblenden und duplizieren.
- Text als exportierbare Konturen: vier Schriftfamilien in Normal/Fett sowie eigene TTF-/OTF-/WOFF-Schriften, im Projekt gespeichert.
- Direkte Motivvorschau beim Verschieben; Farbtrennung und Filmvorbereitung laufen im Hintergrund. Exporte warten auf das aktuelle Ergebnis.
- Farben benennen, Vorschaufarbe ändern, zusammenlegen, zuordnen und deaktivieren.
- A4/A3, Hoch-/Querformat, Millimeter, Maßstab, Spiegelung und gleiche Passkreuze.
- Helle 3D-Ebenenvorschau in der Filmansicht: räumlich auseinanderziehen, drehen, zusammenlegen und den Farbaufbau Schritt für Schritt ansehen.
- Mehrseitiges schwarzes Vektor-PDF und einzelne SVG-Filme. Export bei Überlauf gesperrt.
- Automatisches Speichern in IndexedDB; Projektübersicht und .frame.json-Sicherungen.

## Prüfen und bauen

```sh
npm test
npm run test:acceptance
npm run typecheck
npm run lint
npm run build
npm run preview
```

Die gebaute App läuft mit `preview` unter http://127.0.0.1:4175/. Dieser andere Ursprung hat einen eigenen lokalen Projektspeicher. Der Ordner `dist/` kann auf einem statischen Webserver bereitgestellt werden. Kein Backend erforderlich.

```sh
npm run samples
```

Erzeugt die Beispiele in `examples/` erneut: Original-SVG, Projektdatei, drei schwarze Film-SVGs, dreiseitiges A4-PDF und 100-mm-Kalibrierungsbogen. `/audit.html` im Entwicklungsserver öffnet einen separaten axe-core-Prüfzugang; dieser ist nicht Teil des Produktionsbuilds.

## Tastatur

Bild oder SVG einfügen: Cmd/Ctrl+V. Rückgängig: Cmd/Ctrl+Z. Wiederholen: Shift+Cmd/Ctrl+Z. Motiv bewegen: Pfeile, mit Shift in 10-mm-Schritten. Auswahl aufheben: Escape. Löschen: Entf/Backspace. Ansichtszoom: +/−, Einpassen: 0. In Eingabefeldern bleiben normale Texteingaben erhalten.

Im Vollbildeditor „Flächen bearbeiten“: Rahmen ziehen oder Fläche anklicken. Umschalt bzw. „Auswahl erweitern“ ergänzt die Auswahl; Alt zieht Bereiche ab. Der Rahmen wählt vollständig enthaltene Flächen einschließlich ihrer Löcher. Entf löscht die ganze Auswahl, Cmd/Ctrl+Z nimmt die letzte Flächenlöschung zurück. Leertaste oder Handwerkzeug verschiebt die Ansicht. R erstellt einen Tastaturrahmen: Pfeile bewegen ihn, Umschalt+Pfeile ändern seine Größe, Enter wählt aus. Erst „Änderungen übernehmen“ ändert das Motiv.

Im Textdialog stehen Space Grotesk, DejaVu Sans, DejaVu Serif und DejaVu Sans Mono jeweils in Normal/Fett bereit. Eigene Schriften dürfen bis 3 MB groß sein; höchstens zehn pro Projekt. Sie bleiben lokal und sind in der Projektdatei enthalten. Bereits in einem Bild vorhandene Schrift bleibt nachgezeichnete Geometrie.

In „Filme“ öffnet **„3D-Layer ansehen“** die räumliche Vorschau. Ziehen oder Pfeiltasten drehen die Ansicht; Regler steuern Abstand, Neigung und Drehung. „Zusammengelegt“ zeigt das Motiv frontal. Mit „Aufbau“, den Pfeiltasten darunter oder der Farbliste baust du die Ebenen vom Papier bis zur letzten Farbe auf. „Schwarze Filme“ zeigt die einzelnen Belichtungsmasken. Die Vorschau nutzt dieselben Vektoren, Papiermaße und Passkreuze wie die Filme und verändert das Projekt nicht.

## Dokumentation

- [Bildimport und Vektorisierung](docs/BILDIMPORT.md)
- [Funktionsumfang und Grenzen](docs/SUPPORTED_SVG.md)
- [Implementierung und Prüfnachweise](docs/IMPLEMENTATION_STATUS.md)
- [Anleitung für den physischen Drucktest](docs/PRINT_VERIFICATION.md)
- [Ursprüngliche Spezifikation](docs/FRAME_Product_Specification.md)

Echte Figma-/Illustrator-Zwischenablagekombinationen und physische Film-/Belichtungsergebnisse müssen noch manuell verifiziert werden. Der Bildimport reduziert Verläufe und Teiltransparenz auf deckende Farbflächen. Vorhandene Rastertexturen lassen sich im Bildstil „Raster & Sprenkel erhalten“ bewahren. Neutrale, im Projekt erzeugte Testmuster mit Punkten und Sprenkeln stehen als Projekte und Vektorfilme in [examples/textures](examples/textures/README.md). Eingebettete Bilder und komplexe Effekte innerhalb einer SVG (Masken, Clip-Pfade, use-Referenzen und externe Schriften) werden weiterhin abgewiesen. SVG-Text vor Import in Pfade umwandeln.

## Mitmachen und Lizenzen

Fehler und Vorschläge können über [GitHub Issues](https://github.com/pixelhalunke/Frame-Siebdruck/issues) gemeldet werden. Die [Anleitung für Beiträge](CONTRIBUTING.md) beschreibt Einrichtung und Prüfungen; Hinweise für vertrauliche Sicherheitsmeldungen stehen in [SECURITY.md](SECURITY.md).

FRAME steht unter der [MIT-Lizenz](LICENSE). Du darfst den eigenen Projektcode nutzen, ändern und weitergeben, auch kommerziell, solange der Copyright- und Lizenzhinweis erhalten bleibt.

Schriftdateien und Software-Abhängigkeiten behalten ihre eigenen Lizenzen. Die vollständigen Texte für die Laufzeitabhängigkeiten stehen in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt). Die Projektlizenz und die Dritthinweise werden mit dem Produktionsbuild ausgeliefert. Details stehen unter [Veröffentlichung und Lizenzen](docs/OPEN_SOURCE.md).
