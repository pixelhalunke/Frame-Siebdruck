# FRAME design state

Brief: [Product specification](docs/FRAME_Product_Specification.md), provided by the user, 2026-10-31.

Purpose: let home screen printers turn opaque SVG artwork into separate black vector films with consistent registration and physical dimensions.

Direction: a warm, practical print-studio workbench. Off-white paper, charcoal typography, vermilion accent, precise guides. German interface. Design and Print are distinct modes; source items and derived printing inks have separate panels.

Implementation sequence: specification section 14, phases 0–6. Geometry/export proof first, secure import, separation, editor, print, persistence, acceptance.

Accessibility: explicit field labels, keyboard alternatives to dragging, visible focus, textual error and save states, names/numbers alongside color, responsive panels, reduced-motion support.

Verification: geometry fixtures, actual PDF operators and page dimensions, end-to-end import/edit/export/reload, keyboard and automated accessibility checks. Physical prints remain pending until tested on real equipment.

Decisions: use local storage through IndexedDB; no network artwork processing; reject unsupported SVG constructs with actionable diagnostics rather than guessing.

## Abschluss 31.10.2026

Erste lokale Version implementiert. 37 Fachtests sowie Build und Lint bestanden. Browser-, PDF- und Accessibility-Nachweise und verbleibende manuelle Prüfungen: [Implementierungsstand](docs/IMPLEMENTATION_STATUS.md). Physischen Filmtest und echte Figma-/Illustrator-Clipboard-Kombinationen nicht als erledigt behauptet.

## Bildimport 0.2 — vom Nutzer freigegeben

Der Nutzer hat den vorgeschlagenen Bildworkflow ausdrücklich zur Umsetzung freigegeben: Bilder aus ChatGPT lokal reduzieren und vektorisieren, Flächen entfernen, mit bestehenden Motiven/Text ergänzen und als Farbfilme ausgeben. Die vorhandene Gestaltung und lokale Speicherung werden fortgeführt.

Entscheidungen: Originalvergleich im Importdialog; 1–8 maximale Druckfarben; sichtbare Kontrolle der Hintergrundfarbe, Toleranz, Konturglättung und Fleckenbereinigung. Die Hintergrundentfernung gilt ausdrücklich auch innerhalb des Motivs. Transparente Quellen behalten ihren Hintergrund standardmäßig. Bei deckenden Bildern wird eine dominante Randfarbe vorgeschlagen. Keine Wiederherstellung semantischer Objekte oder ursprünglicher Schriften behauptet.

Technik: deterministische OKLab-Farbreduktion, flächenbasierte Fleckenbereinigung, ImageTracerJS-Konturen als echte Pfade. Abbrechbare Worker mit Zeit-/Komplexitätsgrenzen; vorhandene sichere SVG-, Projekt-, Knockout- und Druckpipeline. Projekte speichern die resultierenden Vektoren, nicht das Pixelbild. Flächenbearbeitung synchronisiert auch die gespeicherte SVG-Quelle.

Dokumentation: [Bildimport](docs/BILDIMPORT.md). 55 Fachtests bestanden; weitere Browser- und Responsive-Nachweise siehe Implementierungsstand.


## Korrektur 0.2.1 — detailreiche Rastermotive

Anforderung: Halbtonpunkte, Löcher und Sprenkel müssen bei der Vektorisierung erhalten bleiben. Der Stil „Raster & Sprenkel erhalten“ arbeitet mit exakten Pixelzellkonturen, zwei Hauptfarben und einem festen Papiercluster. Gesättigte Akzentfarben bleiben trotz geglätteter Randpixel erhalten. Farbgruppen entlasten den Haupteditor, während Regionen einzeln bearbeitbar bleiben.

Die öffentlichen Regressionstests verwenden eigene, deterministische Muster mit 1122 × 1402 Pixeln und mehreren tausend Regionen. Sie prüfen vollständige Zellvergleiche vor und nach Separation, Projekt-Roundtrip, Flächenlöschung und schwarze Vektor-PDFs. Die Muster entstehen in `src/test/helpers/texture-fixture.ts`; private Motive und zugehörige Prüfaufnahmen sind nicht enthalten. Historische Browserprüfungen bleiben im Implementierungsstand als solche beschrieben.

## Erweiterung 0.3 — 01.11.2026, vom Nutzer beauftragt

Brief: Viele Vektorflächen direkt per Auswahlrahmen gemeinsam entfernen, nummerierte Auswahl ersetzen, Vollbild-Arbeitsfläche, schnellere Textbewegung und wählbare Schriften. Bestehende Werkbank-Gestaltung weiterverwenden; keine neue Designrichtung nötig. Primärer Workflow bleibt das lokale Bereinigen detailreicher Bildvorlagen für den Siebdruck.

| Entscheidung | Grund |
| --- | --- |
| Vollbildeditor mit Rahmen, Klick, Mehrfachauswahl, Farbfilter und Batch-Undo | Tausende Sprenkel ohne Durchklicken einzelner Nummern bereinigen. Ersetzt die Nummernauswahl aus 0.2.1. |
| Rahmen wählt ganze, vollständig enthaltene Regionen; Löcher bleiben gebunden | Vorhersehbares Löschen ohne beschädigte Innenkonturen; kein stilles Zerschneiden von Flächen. |
| Additiver Auswahlschalter und Tastaturrahmen zusätzlich zu Umschalt-Drag | Mehrfachauswahl ohne dauerhaft gehaltene Taste bzw. ohne Mausziehen. |
| Änderungen erst beim Übernehmen speichern; lokale und globale Undo-Schritte | Große Bereinigungen bleiben kontrollierbar und rückgängig zu machen. |
| Vier lokale Schriftfamilien × zwei Schnitte plus eigene Fonts im Projekt | Gestaltungsfreiheit, wiederholbare Konturen und keine externen Fontdienste. |
| Direkte memoisiert gezeichnete Vorschau beim Drag; Separation/Filme im Worker | Bewegung wartet nicht auf boolesche Geometrie. Exporte warten ausdrücklich auf das neueste Ergebnis. |
| Räumlicher Flächenindex und getrennte Auswahlüberlagerung | Rahmen und Hervorhebung müssen nicht bei jedem Pointer-Ereignis alle Konturen neu zeichnen. |

Verifiziert: 68 Fachtests, Lint, TypeScript/Produktionsbuild; detailreiches Texturmotiv mit Drag-Rahmen, Farbfilter, Batch-Löschung/Undo und Tastaturrahmen; eigener Font mit Umlauten, Bewegung und Reload; verschachtelter Vollbildeditor im echten PNG-Import; Produktionsbuild mit zwei Filmen und PDF-Link. Desktop 1280 × 720 und Mobil 390 × 844 ohne seitlichen Überlauf, neue Dialogbuttons mindestens 44 px. Axe: keine gemeldeten Verstöße in Vollbildeditor, Schriftwahl und verschachteltem Vollbildeditor; Restprüfungen und Nachweise im [Implementierungsstand](docs/IMPLEMENTATION_STATUS.md).

Grenzen: keine Knotenbearbeitung, keine semantische Texterkennung aus Bildern, kein beliebiger Rechteckschnitt durch zusammenhängende Flächen. Kein gemessener FPS-Nachweis. Reale Screenreader-Abnahme, nativer 200-%-Zoom, physischer Druck und bestätigter nativer Download im eingebetteten Browser bleiben offen; keine entsprechende Erfolgsaussage. Eigene Fonts unterstützen nur tatsächlich dekodierbare Konturschriften; komplexes Shaping wird bei Fehlern abgewiesen.

## Erweiterung 0.4 — 01.11.2026, 3D-Filmvorschau

Brief / Freigabe: Nutzer wünscht ausdrücklich eine zusätzliche räumliche Ansicht in der Filmvorbereitung, um die aufeinander aufgebauten Farbebenen zu sehen. Der Screenshot ist eine räumliche Referenz, keine Kopiervorlage für Inhalte oder Dark Mode. Die helle FRAME-Gestaltung bleibt verbindlich. Umsetzung direkt beauftragt.

| Entscheidung | Grund |
| --- | --- |
| Große separate Vorschau über „3D-Layer ansehen“ | Genug Raum für schwebende Ebenen, ohne die bestehende Filmprüfung zu überladen. |
| Papierbasis plus tatsächliche Filmvektoren, Maße und Passkreuze | Die räumliche Ansicht erklärt dieselben Farbauszüge, die exportiert werden. |
| CSS-3D statt zusätzlicher Renderingbibliothek; memoisiert gezeichnete SVGs | Keine neue Abhängigkeit oder Geometrieberechnung für Kamerabewegungen. |
| Abstand, Neigung, Drehung, Aufbau und Frontalansicht | Beziehungen zwischen getrennten Farben und zusammengesetztem Motiv bleiben nachvollziehbar. |
| Schrittweiser Aufbau ohne automatische Wiedergabe | Zeitpunkt und Bewegung bleiben unter Nutzerkontrolle; kein Autoplay. |
| Drag plus Tastatur und explizite Regler | Raumansicht ist auch ohne präzises Ziehen bedienbar. |
| Ansichtsparameter bleiben lokal, keine Änderung der Filmdaten | Ein Gimmick zur Betrachtung beeinflusst keine Druckeinstellungen oder exportierten Konturen. |

Verifikation: 68 bestehende Fachtests, Lint und Produktionsbuild bestanden. Historische Browserprüfung mit einem Texturmotiv: Aufbau 0→1→2, schwarze/gefärbte Ebenen, Zusammenlegen, wiederholter Drag, Tastatur, Reglergrenzen und Fokusrückgabe. Produktionsbuild: A4-Hoch-/Querformat, tatsächliche Kontur-/Passkreuzgleichheit zur normalen Filmansicht und unveränderter druckbereiter Zustand nach Rückkehr. Desktop 1280 × 720 / 1440 × 960 und Mobil 390 × 844 ohne seitlichen Überlauf; alle neuen Buttons mindestens 44 px. Axe 0 Verstöße / 25 bestandene Prüfungen, manuelle Restkategorien im Implementierungsstand.

Grenzen: Die Farbstapel erklären den geometrischen Aufbau, keine physikalische Tintenmischung. Reihenfolge folgt der bestehenden Farbliste. Keine neue Zusage zu nativen Downloads, physischem Druck, realem Screenreader-Test oder nativem 200-%-Zoom.

Abschließende Dialogprüfung: Globale Projektbefehle werden bei offenem Dialog ignoriert. Cmd+Z verändert im 3D-Dialog keine Druckeinstellung; nach Schließen funktioniert dasselbe Kürzel wieder. Teständerung im separaten Produktionsursprung vollständig zurückgenommen. Alle 68 Tests, Lint und Build nach dieser Korrektur erneut bestanden.

## Vorbereitung für Open Source — 01.11.2026

Private Referenzmotive, Herkunftsdateinamen und Prüfaufnahmen wurden aus dem aktuellen Projektstand entfernt. Testabdeckung für feine Texturen und räumliche Auswahl bleibt über eigene deterministische Muster erhalten. Quellcodebegriffe für geometrische Flächen bleiben fachlich unverändert. Der eigene Projektcode steht unter MIT. Projektlizenz und Dritthinweise werden in den Build kopiert. Beiträge, vertrauliche Sicherheitsmeldungen und automatische Prüfungen sind dokumentiert. Das eigenständige öffentliche GitHub-Repository beginnt mit einem sauberen Startcommit; der bisherige Bestand bleibt als privates Archiv und lokale Sicherung erhalten. Details sind in `docs/OPEN_SOURCE.md` festgehalten.
