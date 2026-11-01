# FRAME 0.4 — Implementierungsstand

Stand: 01.11.2026. Vollbild-Flächeneditor, Schriftwahl und Hintergrundberechnung in 0.3; räumliche Filmvorschau in 0.4 ergänzt. Frühere Nachweise unten sind historische Prüfläufe. Grundlage ist die Spezifikation 2.1 plus die vom Nutzer beauftragten Erweiterungen. Die App läuft lokal ohne Konto, Backend oder Übertragung von Motiven.

| Phase | Ergebnis |
| --- | --- |
| 0 — Grundlage / Risiken | React, TypeScript, Vite, Tailwind, Lucide und zugängliche Radix/shadcn-artige UI-Bausteine. Geometrie-/PDF-Risikotests bestanden. |
| 1 — Import | Datei, Drag-and-drop, SVG-Code, dokumentweites Einfügen. Bildimport ergänzt in 0.2; XML-/Attribut-/Style-Validierung. Roh-SVG wird nie in die Oberfläche eingesetzt. |
| 2 — Separation | Deckende Füllungen, expandierte Konturen, Transformationen, Compound-Pfade, echte boolesche Aussparungen, Zusammenführung sichtbarer Farben. |
| 3 — Editor | Motivliste, Verschieben und Skalieren per Maus, Maße/Position/Drehung numerisch, Zentrieren, Reihenfolge, Duplizieren, Sichtbarkeit, Text als Pfade, Farben zuordnen/benennen/deaktivieren, Maskenansicht, Undo/Redo. |
| 4 — Filme | A4/A3, Hoch-/Querformat, Maßstab, Spiegeln, Passkreuze, Preflight, physisch dimensionierte SVGs und mehrseitige Vektor-PDFs. |
| 5 — Zuverlässigkeit | IndexedDB, automatische Speicherung, Projektübersicht, Öffnen/Duplizieren/Löschen, versionierte Projektdateien, Sicherung/Wiederherstellung, Tastaturbedienung, zugängliche Dialoge. |
| 6 — Abnahme | Digitale Tests und Browser-Prüfungen durchgeführt. Physischer Foliendruck sowie echte Figma-/Illustrator-Kombinationen bleiben offen. |

## Nachweise

- 37 automatische Tests: sichere Eingabe, Grundformen, verschachtelte Transformationen, Konturen, Füllregeln, Überdeckung, vollständig verdeckte Farben, zusammengeführte Farben, deaktivierte Farben, Unicode-Textkonturen, Determinismus, Speicherung/Deserialisierung, PDF-Seitenzahl, Millimetermaße und PDF-Operatoren.
- PDF-Prüfung liest die tatsächlichen Dokument-Streams: schwarze Vektorfüllung, `f*` für Aussparungen, korrekte mm→pt-Matrix, keine Bild-XObjects.
- End-to-end-Fachtest: SVG-Datei → Farbtrennung → Farbzuordnung → Serialisierung/Reload → SVG/PDF.
- Kurven bleiben Vektoren. Numerische Tests nutzen 0,01 mm als digitale Maßtoleranz; der zusätzliche Test begrenzt paarweise Maskenüberschneidung des Fixtures auf unter 0,0001 mm². Das ist keine Behauptung mathematisch exakter Arithmetik oder physischer Druckgenauigkeit.
- Produktionsbuild, Typecheck und ESLint bestanden. Bibliotheken exakt gepinnt. npm-Audit nach korrigierter minimatch-Abhängigkeit: keine bekannten Schwachstellen.
- Echtes dreiseitiges Demo-PDF in `examples/films/` erzeugt, mit Poppler gerendert und alle drei Seiten visuell geprüft: Aussparungen, Schriftkonturen und gemeinsame Passkreuze.
- Produktionsbuild im Browser gestartet, inklusive lokalem WASM, Schrift und Druckvorbereitung; keine Browserfehler. Mausbewegung und Skalierungsgriff getestet, Änderungen per Undo zurückgenommen.
- Browser: Demo öffnen; Breite 130→150 mm; zentrieren; Farben 3→2 zusammenlegen; „ÖL & FARBE“ als Text hinzufügen; Projekt neu laden und unveränderte Werte wiederfinden; SVG-Code importieren; dokumentweites SVG-Paste; Pfeiltaste bewegen und Cmd+Z rückgängig; 200-%-Überlauf blockiert Export.
- axe-core: Startseite, Editor und Druckvorbereitung ohne gemeldete WCAG-A/AA-Verstöße nach Kontrastkorrekturen. Automatische Prüfung meldet einzelne manuell zu prüfende Farbkontraste bei Vektorgrafiken. Keine vollständige Zertifizierung oder reale Screenreader-Abnahme behauptet.
- Responsive Ansicht bei 390 px: kein horizontaler Seitenüberlauf; Motive und Farben unter der Arbeitsfläche weiterhin zugänglich. Desktop bei 1440 × 960 geprüft. Reduzierte Bewegung und hoher Kontrast werden berücksichtigt.

## Grenzen / offene manuelle Prüfungen

- Der eingebettete Codex-Browser erzeugt PDF-/SVG-Blob-Dateilinks, lieferte beim automatisierten Downloadversuch aber kein bestätigtes Datei-Ereignis. Direkte Links stehen als Rückfall bereit. Speichern und Druckdialog bitte in einem normalen Chrome-/Safari-Fenster prüfen; die bereits erzeugten Beispieldateien sind zusätzlich im Projektordner verfügbar.
- Echte Figma-/Illustrator-Clipboard-MIME-Kombinationen wurden nicht behauptet. SVG-Text-Paste wurde im Browser tatsächlich geprüft. Die Matrix steht in `SUPPORTED_SVG.md`.
- Physische 100-mm-Messung, Folienopazität, Passer und Belichtung sind **offen / durch den Nutzer zu prüfen**, siehe `PRINT_VERIFICATION.md`.
- Eingeschränkte SVG-Menge, siehe `SUPPORTED_SVG.md`. Komplexe Effekte werden abgewiesen. Seit 0.3 laufen Farbtrennung und Filmvorbereitung im Worker; Importvalidierung, Bereichsaufteilung und Export brauchen weiterhin Arbeit auf dem Hauptthread. Sehr komplexe Grafiken können länger rechnen. Grenzen: 2 MB pro allgemeiner SVG, 2.500 gespeicherte Vektorgruppen und 100 Motive pro Projekt; Rasterquellen haben die gesonderten Grenzen aus `BILDIMPORT.md`.
- Kein Git-Repository war vorhanden; es wurden keine fremden Repositories oder Remotes angelegt oder verändert.

## Bibliotheksbefunde

- PathKit 1.0 stellt `asWinding` nicht bereit; boolesche Resultate sind evenodd. Deshalb werden SVG und PDF durchgängig mit entsprechender Füllregel ausgegeben.
- Skias standardmäßiger SVG-Serializer begrenzt signifikante Stellen. FRAME serialisiert die vollständigen float32-Pfadkommandos mit bis zu neun Nachkommastellen. Rationale Konturkurven werden adaptiv als kubische Béziersegmente mit geprüfter Abweichung im jeweiligen Quellkoordinatensystem ausgegeben. Diese Umwandlung betrifft nur rationale Vektorkurven. Der separate Bildimport in 0.2 vektorisiert Pixelbilder über ImageTracerJS.
- OpenType.js 2.0 kann bei bestimmten Rundungen in `toPathData` NaN ausgeben. FRAME nutzt deshalb die überprüften Konturkommandos und einen eigenen endlichen Zahlenschreiber. Das echte Demo und Umlaute sind Regressionstests.

## Start / Tests

`npm run dev` startet http://127.0.0.1:5175/. Der feste Port erhält den Ursprung für lokale Projekte.

`npm test`, `npm run test:acceptance`, `npm run typecheck`, `npm run lint`, `npm run build`.

`npm run samples` erzeugt die mitgelieferten Beispiele erneut. `/audit.html` ist ein lokaler Prüfzugang mit axe-core und gehört nicht zum Produktionsbuild.

## Ergänzung 0.2 — Bildimport

Der vom Nutzer freigegebene Bildworkflow ist implementiert, siehe [Bedienung und Grenzen](BILDIMPORT.md).

- JPEG, PNG, WebP, AVIF, GIF und BMP durch den echten Dateiimport im Browser geprüft. Transparente PNGs behalten vorhandene Transparenz; beschädigte Dateien werden verständlich abgewiesen und lassen sich nicht übernehmen.
- Lokal: gewichtetes, deterministisches OKLab-Clustering (1–8 Farben), Hintergrundentfernung mit Farbauswahl/Toleranz, flächenbasierter Fleckenfilter und ImageTracerJS-Konturen. Separate abbrechbare Worker, 30-Sekunden-Limit und begrenzte Auflösung/Komplexität.
- Originalvergleich, einzelne Flächen entfernen, Druckfarben weglassen/zurücksetzen, neue Vektoren übernehmen; spätere Flächenbearbeitung im Editor aktualisiert auch die gespeicherte SVG-Quelle.
- Echtes PNG-Paste mit Cmd+V geprüft. SVG hat weiterhin Vorrang, wenn mehrere Clipboard-Formate vorhanden sind.
- Schnelle Einstellungswechsel (8 → 2 → 3 Farben; Fein → Glatt → Normal) behalten das letzte Ergebnis. Vorherige Worker werden beendet. Neue Vorschauen sind während der Berechnung nicht übernehmbar.
- JPEG mit 100 mm Bildbreite übernommen, Fläche entfernt, Änderung übernommen und per Undo zurückgenommen; nach Neuladen dieselben Vektoren und Maße. Drei getrennte Belichtungsfilme vorbereitet und PDF-Dateilink erzeugt.
- **55 Fachtests in acht Dateien bestanden**, einschließlich Hintergrundrauschen, Transparenzschwelle, Löchern/Inneninseln, Farbgrenzen, deterministischer Ausgabe, Maskenüberschneidungen, physischen PDF-Maßen, Projekt-Roundtrip nach Flächenlöschung, Worker-Abbruch/Timeout und Größenprüfung komprimierter Header. TypeScript-Prüfung, ESLint und Produktionsbuild bestanden.
- Produktionsversion auf eigenem lokalen Ursprung gestartet; JPEG → drei Druckfarben → Vektorübernahme → drei druckbereite Filme tatsächlich geprüft. Keine Fehler oder Warnungen in der Browserkonsole dieses Durchlaufs.
- axe-core im Bilddialog: keine gemeldeten Verstöße, 26 Prüfungen bestanden. Manuelle Restprüfung bei `aria-hidden-focus` und grafischen Farbkontrasten; keine umfassende Screenreader-Zertifizierung behauptet. Toleranzregler ist explizit beschriftet; Fokus bleibt beim Vorwärts-/Rückwärtswechsel im Dialog.
- 390 × 844 px: Seitenbreite 390, Dialogbreite 370, kein horizontaler Überlauf. Übernehmen/Abbrechen bleiben am unteren Dialogrand sichtbar. Zusätzlich 720 × 480 als enger Reflow-Test und Desktop 1440 × 960 geprüft. Nativer Browserzoom ließ sich über den eingebetteten Browser nicht bestätigen; der Reflow-Test wird nicht als erfolgreicher nativer 200-%-Zoom ausgegeben.
- Der Import wird erst nach Wiederherstellung lokaler Projekte freigegeben, damit unmittelbar nach dem Start gewählte Dateien nicht mit dem Laden des letzten Projekts kollidieren.

Die bekannten Grenzen des eingebetteten PDF-/SVG-Downloads und die ausstehende physische Druckprüfung gelten weiterhin. Die Bilderkennung hängt bei Spezialformaten vom Browser ab. Das Projekt speichert Vektoren, keine ursprünglichen Pixelbilder oder semantisch erkannten Objekte.

## Korrektur 0.2.1 — Rasterpunkte und Sprenkel erhalten

Der Texturmodus verarbeitet detailreiche zweifarbige Rastermotive ohne Kurvenglättung. Papier bleibt ein fester Cluster der Farbreduktion; dominante Volltonfarben erhalten gesättigte Akzente trotz geglätteter Randpixel. Pixelzellkonturen bewahren Punkte, Löcher und Einzelregionen. Farbgruppen werden im Haupteditor gebündelt gezeichnet; einzelne Regionen bleiben bearbeitbar.

- Bis 4 Mio. Pixel, 2.400 Pixel Kantenlänge und 50.000 Außenflächen; zusätzliche Pfad- und Scanline-Budgets begrenzen die Verarbeitung. Allgemeine externe SVGs behalten ihr 2-MB-Limit.
- Bild-SVGs und gespeicherte Raster-Flags werden auch beim Projektimport geprüft. Nicht vertrauenswürdige Rasterquellen werden abgewiesen.
- Die veröffentlichten Regressionstests verwenden zwei eigene deterministische Muster mit je 1122 × 1402 Pixeln. Jede klassifizierte Bildzelle wird vor und nach Separation/Positionierung mit den Vektoren verglichen. Dazu kommen Löcher, Überlagerungen, Flächenlöschung und Projekt-Roundtrip.
- Die Exporttests prüfen schwarze PDF-Vektoren, A4-Maße, zwei PDF-Seiten und identische Passkreuze. Neutrale Projekt-, PDF- und SVG-Beispiele liegen unter `examples/textures/`; `npm run samples:textures` erzeugt sie neu.
- Historische Browserprüfungen deckten Import, Detailzoom, Flächenbearbeitung, Undo/Reload, ergänzten Text und PDF-Erzeugung ab. Private Motive und Prüfaufnahmen sind nicht Bestandteil des veröffentlichten Projektstands. Diese Prüfungen sind keine erneute Browserabnahme der später eingeführten neutralen Testmuster.

Dieser Modus erhält bestehende Halbtonpunkte, erzeugt aber kein neues fotografisches Druckraster und rekonstruiert keine semantischen Objekte. Physischer Foliendruck, Belichtung und native Druckdialoge bleiben separat zu prüfen.

## Erweiterung 0.3 — direkte Vektorauswahl, Schriften und Reaktionszeit

Nutzerauftrag vom 01.11.2026: Flächen auf großer Arbeitsfläche mit der Maus und als Mehrfachauswahl entfernen, Nummernauswahl abschaffen, Schrift leichter bewegen, Schriftart wählen und die App beschleunigen.

### Bedienung und Daten

- Vollbildeditor statt kleinem Detailfenster, auch als Unterdialog im Bildimport. Klick, vollständig umschließender Rahmen, additive Auswahl per Umschalt/Ctrl/Cmd oder Schalter, Alt zum Abziehen, Farbfilter und Alles auswählen. Auswahlanzahl ist Rückmeldung, keine Flächennummer. Ein Löschvorgang kann beliebig viele ausgewählte Regionen entfernen; bis zu 50 lokale Rückgängig-/Wiederholen-Schritte. Abbrechen bleibt ohne Wirkung auf das Projekt. Übernommene Änderungen sind zusätzlich im Haupteditor rückgängig zu machen.
- Zoom 100–800 %, Handwerkzeug/Leertaste/Mittelmaustaste zum Verschieben. Tastaturrahmen mit R, Pfeilen, Umschalt+Pfeilen und Enter. Alle neuen Toolbar-Schaltflächen mindestens 44 × 44 CSS-Pixel; Fokus kehrt nach Löschen zur Arbeitsfläche zurück.
- Allgemeine SVG-Compound-Pfade werden in getrennte Außenregionen mit zugehörigen Löchern/Inneninseln aufgeteilt. Kurven bleiben erhalten; Grenzen und Verschachtelung werden aus den tatsächlichen Bézierkurven bestimmt. Beim Speichern werden Regionen je ursprünglichem Pfad wieder zusammengesetzt. Dies ist keine Bearbeitung von Bézierknoten und kein freies Ausschneiden durch einen Bereich.
- Space Grotesk, DejaVu Sans, DejaVu Serif und DejaVu Sans Mono jeweils Normal/Fett; lokale Fontdateien und Lizenztexte unter `public/fonts/`. Eigene TTF/OTF/WOFF bis 3 MB, höchstens zehn pro Projekt, Inhaltsprüfung und Hash-ID. Schriftdateien werden lokal im Projekt und in dessen Sicherung gespeichert; Text wird weiter als Konturen exportiert. Alte Projekte bleiben lesbar, alte Texte behalten ihre bisherige Standardschrift.
- OpenType.js kann bestimmte DejaVu-`ccmp`-Tabellen nicht anwenden. Für lateinische Zeichen, Zahlen, Interpunktion und Symbole gibt es dann eine Kontur-/Kerning-Rückfalllösung. Komplexe Schriftsysteme werden bei fehlgeschlagenem Shaping verständlich abgewiesen; keine universelle Unterstützung aller Schriftdateien oder Schriftsysteme behauptet.

### Leistung

- Die Designansicht zeichnet während einer Bewegung memoisiert die ursprünglichen, zugeordneten Farbpfade; Pointer-Ereignisse werden pro Animationsbild gebündelt. Text lässt sich auch zwischen den Buchstaben über seinen Auswahlrahmen greifen. Die finale Pointerposition wird gespeichert, ein Drag ergibt einen Undo-Schritt. Escape bricht eine laufende Bewegung ab.
- Farbtrennung und Filmvorbereitung laufen in einem warmen separaten Worker. Es gibt höchstens einen laufenden und einen neuesten wartenden Auftrag. Überholte Resultate werden ignoriert; Exporte sind bis zum aktuellen Resultat gesperrt. Schriftdateien und SVG-Quelltext werden nicht mit jedem Geometrieauftrag kopiert. Metadatenänderungen starten keine neue Separation. Papier-/Druckänderungen nutzen vorhandene Separationen erneut.
- Flächenvorschau und Auswahl liegen getrennt; eine räumliche Indexierung begrenzt Trefferprüfungen. Die Auswahl entsteht beim Loslassen, nicht für jede Mausbewegung durch sämtliche Konturen. Pixelzellflächen werden weiterhin nach Farben gebündelt gezeichnet.
- Automatisches Speichern lädt nicht mehr nach jedem Drag alle Projekte aus IndexedDB zurück. Bei 100-%-Druck ohne Spiegelung entfällt eine unnötige Pfadtransformation.
- Keine belastbare FPS-Messung erhoben. Die Browserprüfung bestätigt den funktionierenden direkten Drag und die getrennte Hintergrundberechnung; sehr große überlappende Geometrie sowie Export/Import können weiterhin Zeit brauchen.

### Prüfnachweise

- **68 Tests in zwölf Dateien bestanden**, einschließlich der Textur-Regressionstests. Neue Tests: SVG-Außenregionen/kurvige Löcher/rekomponierte Quelle, tausende Rasterregionen und Batch-Löschung, Undo/Redo, alle acht Schriftschnitte mit Umlauten und Vektor-PDF, eigener Font nach Modulneustart/Projekt-Roundtrip, ungültige Fontdateien sowie neuester Workerauftrag/Timeout/Startfehler/Geometrievergleich. ESLint und Produktionsbuild einschließlich TypeScript bestanden.
- Historische Browserprüfung mit einem detailreichen Texturmotiv: Rahmen über Logo/Schrift gezogen, 18 Regionen gemeinsam gelöscht und übernommen, anschließend über Haupt-Undo wiederhergestellt. 1.674 gelbe Regionen per Farbfilter ausgewählt. Über Tastaturrahmen/additiven Schalter 2.064 Regionen markiert und per Backspace gemeinsam entfernt; Cmd+Z stellt die ganze Löschung wieder her. Prüflöschungen verworfen, Originalmotiv erhalten. Abschließender Rahmen markiert 21 Regionen ohne Löschung.
- Eigene DejaVu-Sans-Mono-Bold-TTF über Dateiauswahl importiert, „ÖL & FARBE“ ergänzt, per Maus bewegt; x/y-Werte ändern sich, anschließend drei aktuelle Filme bereit. Nach Reload Schriftwahl und Position wiedergefunden. Temporärer Text wieder entfernt; Original bleibt mit zwei Farben erhalten.
- Rastervorlage erneut im Bildimport geöffnet, Vollbild-Unterdialog und Rückkehr/Abbrechen geprüft. Produktionsbuild auf 4175: gesicherte Textur-Projektdatei geöffnet, zwei Filme vorbereitet und PDF-Dateilink erzeugt; keine Warnungen/Fehler in der Browserkonsole. Nativer Dateiabschluss bleibt unbestätigt.
- axe-core: Vollbildeditor **0 Verstöße / 23 bestandene Prüfungen**, Schriftwahl **0 / 24**, Vollbild-Unterdialog im Bildimport **0 / 23**. Manuelle Restkategorien `aria-hidden-focus` und grafischer `color-contrast`. Tastaturrahmen, Batch-Delete/Undo sowie zugängliche Namen und Beschriftungen tatsächlich geprüft. Keine umfassende Screenreader-Zertifizierung und kein bestätigter nativer 200-%-Browserzoom.
- Desktop 1280 × 720 sowie 390 × 844 px geprüft. Mobil: Dokument-/Scroll-/Dialogbreite jeweils 390 px, Vollbildhöhe 844 px, Zeichenfläche 405 px hoch, kein horizontaler Seitenüberlauf; alle neuen Dialogbuttons mindestens 44 × 44 px. Übernehmen/Abbrechen bleiben erreichbar. Zoom/Selektion haben keine zusätzliche Animation; Reduced-Motion-Regeln bleiben bestehen.

Bekannte Build-Hinweise bleiben die PathKit-Externalisierung von `fs`/`path` und das Hauptbundle über 500 kB. Physischer Druck und nativer Download im eingebetteten Browser bleiben separat zu prüfen.

## Erweiterung 0.4 — räumlicher Farbaufbau in der Filmansicht

Nutzerauftrag: Eine helle 3D-Ebenenansicht nach der groben räumlichen Orientierung des bereitgestellten Screenshots. Die bestehende helle Werkbank bleibt erhalten; kein Dark Mode.

- „3D-Layer ansehen“ in der Filmansicht öffnet eine große Vorschau mit Papierbasis und transparenten Farbebenen. Jede Ebene zeichnet direkt den vorbereiteten `Film.d` mit dessen Papiermaßen, Füllregel und Passkreuzen. Maßstab, Spiegelung und Druckformat stammen daher aus derselben Vorbereitung wie PDF/SVG. Es wird keine neue Geometrie erzeugt.
- Räumliche und frontal zusammengelegte Ansicht, Abstand 0–100 %, Neigung 0–65° und Drehung −65–65°. Drag bzw. Pfeiltasten drehen; Home stellt die räumliche Perspektive wieder her. Alternative Regler sind vollständig beschriftet und per Tastatur bedienbar. Kameraänderungen werden pro Animationsbild gebündelt; die komplexen SVG-Ebenen bleiben memoisiert. Keine zusätzliche 3D-Bibliothek, kein Backend und keine neuen Laufzeitabhängigkeiten.
- „Aufbau“ mit Schritttasten, Regler oder Farbliste zeigt Papier allein bis zu allen Farben. Reihenfolge entspricht den aktiven Filmen/Farben im Projekt, von unten nach oben. Druckfarben und schwarze Filme sind umschaltbar. Nicht aufgebaute Ebenen sind unsichtbar; beim Zusammenlegen verschwinden die getönten Ebenenhintergründe, damit das gesamte Motiv unverändert sichtbar ist.
- Ansichtsänderungen sind lokal und werden nicht ins Projekt geschrieben. Der Button wartet während einer Filmaktualisierung und bleibt ohne aktive Farbe gesperrt. Escape/Schließen gibt den Fokus an den Einstieg zurück. Mobil gibt es eine einzelne scrollbare Ansicht mit fest erreichbarem Schließen-Button. Alle neuen Buttons und Regler haben mindestens 44 px Höhe; keine automatische Rotation oder animierte Schleife. Reduced Motion deaktiviert zusätzliche Übergänge.
- Die Darstellung erklärt die geometrische Farbauflösung. Sie ist keine physikalische Simulation von Tintenmischung, Deckkraft oder tatsächlicher Druckreihenfolge auf dem Sieb.

### Verifikation 0.4

- **68 Tests in zwölf Dateien bestanden**, ESLint und Produktionsbuild einschließlich TypeScript bestanden. Die bestehende Separation und Exportpipeline bleiben unverändert. Bekannte Build-Hinweise zu PathKit und Bundlegröße bestehen fort.
- Historische Browserprüfung mit einem Texturmotiv: Papier allein → erste Farbe → beide Farben, Rückschritt, Direktwahl der Aufbaustufe, schwarze Filme und zusammengelegte Farbvorschau geprüft. In der Schwarzansicht sind alle Film- und Passkreuzpfade schwarz. Wiederholter Drag ändert Neigung/Drehung; Pfeiltasten und die Minimal-/Maximalwerte aller Kameraregler geprüft. Escape schließt und fokussiert „3D-Layer ansehen“.
- Globale Projekt-Tastenkürzel, Clipboard-Import und Datei-Drop werden während eines offenen Dialogs abgefangen. Produktionsregression: Spiegelung geändert, im 3D-Dialog Cmd+Z gedrückt → Einstellung bleibt unverändert und Dialog offen. Nach Schließen funktioniert Cmd+Z wieder und stellt die ursprüngliche Spiegelung sowie zwei druckbereite Filme her. Maximaler Ebenenabstand und beide Kameraregler am oberen Anschlag: alle Ebenen bleiben innerhalb der geprüften Desktop-Zeichenfläche.
- Produktionsbuild auf eigenem lokalen Ursprung: 3D-Vorschau im A4-Hoch- und Querformat geöffnet, anschließend ursprüngliches Hochformat wiederhergestellt. Direkter DOM-Vergleich bestätigt identische Filmkonturen und Passkreuze zwischen 3D-Ebenen und normalen Filmvorschauen. Zwei Filme bleiben druckbereit. Keine Warnungen/Fehler in den Browserkonsolen der geprüften Entwicklungs-/Produktionsdurchläufe.
- Desktop 1280 × 720 und 1440 × 960 geprüft. Mobil 390 × 844: Seiten-/Scroll-/Dialogbreite jeweils 390 px, Zeichenfläche 333 px hoch, keine zu kleinen neuen Buttons. Kameraregler am unteren Ende bedienbar; Schließen bleibt auch dort bei y = 10 px erreichbar. Keine horizontale Überbreite des Dialogs.
- axe-core im 3D-Dialog: **0 Verstöße, 25 bestandene Prüfungen**; manuelle Restkategorien `aria-hidden-focus` und grafischer `color-contrast`. Zugängliche Namen aller vier Regler und Tastaturbedienung zusätzlich geprüft. Keine reale Screenreader-Zertifizierung und kein separat bestätigter nativer 200-%-Browserzoom.
