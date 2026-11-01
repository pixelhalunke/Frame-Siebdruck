# Bilder für den Siebdruck vorbereiten

FRAME 0.4 nimmt Pixelbilder an und wandelt ihre sichtbaren Flächen in echte Vektoren um. Die Verarbeitung läuft lokal im Browser. Es gibt keinen Upload, KI-Dienst oder API-Schlüssel.

## Workflow

1. Auf der Startseite „Bild oder SVG öffnen“ oder im Editor „Bild / SVG“ wählen. Alternativ eine Datei ablegen oder ein kopiertes Bild mit Cmd/Ctrl+V einfügen.
2. Original und Druckvorschau vergleichen. „Maximale Druckfarben“ auf 1 bis 8 stellen. Jede verwendete Farbe braucht ein Sieb.
3. Hintergrund bei Bedarf entfernen. Die vorgeschlagene Farbe stammt vom Bildrand. Bei transparenter Vorlage bleibt die vorhandene Transparenz standardmäßig bestehen; bei einem deckenden Bild mit dominanter Randfarbe wird Hintergrundentfernung vorgeschlagen. Farbe und Toleranz lassen sich ändern. **Ähnliche Pixel werden im gesamten Bild transparent**, einschließlich weißer/heller Details innerhalb des Motivs.
4. Den Bildstil wählen: **„Raster & Sprenkel erhalten“** übernimmt vorhandene Rasterpunkte, Löcher und raue Kanten ohne Kurvenglättung. Bei vielen harten Bildkanten wird dieser Stil mit zwei Druckfarben und ausgeschaltetem Fleckenfilter vorgeschlagen. „Illustration glätten“ bietet Fein / Normal / Glatt für einfache Illustrationen. „Kleine Flecken entfernen“ bereinigt zusammenhängende Farbinseln. Neue Einstellungen setzen manuelle Auslassungen zurück.
5. „Flächen groß bearbeiten“ öffnet die Vektoren im Vollbild. Einen Rahmen um die gewünschten Flächen ziehen, bei Bedarf mit Umschalt oder „Auswahl erweitern“ ergänzen und gemeinsam löschen. Alt zieht Bereiche von der Auswahl ab. Es werden vollständig eingeschlossene Flächen ausgewählt; Löcher bleiben bei ihrer Außenfläche. Klickauswahl, Farbfilter, „Alles auswählen“, Rückgängig und Wiederholen ergänzen den Rahmen. Es gibt keine Flächennummern. Druckfarben lassen sich weiterhin über die beschrifteten Farbtasten weglassen. Neue Vektorisierungseinstellungen setzen manuelle Auslassungen zurück.
6. Breite in Millimetern einstellen und „Als Vektoren übernehmen“ wählen. Die Breite beschreibt die gesamte Bildfläche einschließlich freigestellter Ränder. Der tatsächlich bedruckte Bereich steht zusätzlich im Editor und in der Druckvorbereitung.
7. Im Editor kann das Bild wie ein anderes Motiv bewegt, skaliert, ergänzt und mit Text kombiniert werden. „Flächen bearbeiten“ öffnet denselben Vollbildeditor auch später. Abbrechen verwirft seine Änderungen; Übernehmen speichert sie. Das Rückgängig im Haupteditor stellt eine übernommene Änderung wieder her. Werden dort alle Flächen entfernt, wird das ganze Motiv entfernt und kann ebenfalls rückgängig gemacht werden.
8. Druckfarben und schwarze Belichtungsmasken prüfen, anschließend PDF/SVG wie gewohnt ausgeben.

### Vollbildeditor bedienen

Die Ansicht lässt sich bis 800 % vergrößern. Handwerkzeug, gedrückte Leertaste oder mittlere Maustaste verschieben den Ausschnitt; Scrollbalken bleiben verfügbar. Der Auswahlrahmen entfernt ganze Regionen, er schneidet keine beliebigen Rechtecke aus einer zusammenhängenden Fläche. Bei allgemeinen SVGs werden getrennte Außenkonturen eines zusammengesetzten Pfades einzeln auswählbar, zugehörige Löcher bleiben erhalten.

Tastatur: Cmd/Ctrl+A wählt alle Flächen der eingestellten Farbe, Entf/Backspace löscht die Auswahl, Cmd/Ctrl+Z nimmt den letzten Löschvorgang zurück, Umschalt+Cmd/Ctrl+Z wiederholt ihn. R erstellt einen Rahmen; Pfeile bewegen ihn, Umschalt+Pfeile ändern die Größe, Alt+Pfeile arbeiten feiner. Enter übernimmt den Rahmen, Umschalt+Enter ergänzt die bisherige Auswahl. Escape hebt zunächst Rahmen/Auswahl auf. Mit dem Schalter „Auswahl erweitern“ sind mehrere Auswahlvorgänge auch ohne gehaltene Umschalttaste möglich.

Schrift aus der Bildvorlage wird nicht wieder zu Text. Unerwünschte Buchstaben lassen sich als Flächen entfernen; neue Schrift wird über „Text hinzufügen“ mit der gewünschten Schriftart ergänzt. Vier Familien mit je zwei Schnitten und eigene lokale TTF-/OTF-/WOFF-Dateien sind verfügbar. Die Filmvorschau wird nach Bearbeitungen im Hintergrund aktualisiert; der Export bleibt bis zum aktuellen Ergebnis gesperrt.

## Geeignete Vorlagen

Geeignet sind flächige Illustrationen sowie bereits gerasterte Poster-/Grunge-Motive mit wenigen Druckfarben. Neutrale Testmuster mit Punkten, Löchern und Sprenkeln prüfen die Verarbeitung bei 1122 × 1402 Pixeln. PNG vermeidet zusätzliche JPEG-Artefakte und kann Transparenz enthalten. JPEG funktioniert ebenfalls; feine Kompressionsstörungen können mehr Bereinigung brauchen.

Fotos und Verläufe werden zu wenigen deckenden Farbflächen stilisiert. Vorhandene Rastertexturen werden im entsprechenden Bildstil erhalten. Die Farbreduktion entscheidet weiterhin, welche geglätteten Randpixel zu Papier oder Druckfarbe gehören; sie rekonstruiert keine zusätzlichen Quelldetails. Die Vorschau ist deshalb Teil des Workflows. Es werden Farbflächen rekonstruiert, keine ursprünglichen Objekte oder verdeckten Motivteile. Schrift in einem Bild bleibt nachgezeichnete Geometrie; für saubere, veränderbare Schrift das Textwerkzeug verwenden. Eine Raster-/Halbtonseparation für Fotos ist nicht enthalten.

## Dateiformate und Grenzen

- Empfohlen: JPEG/JPG, PNG und WebP. Zusätzlich im Codex-Browser geprüft: AVIF, GIF und BMP.
- Weitere Bildformate werden angenommen, wenn der jeweilige Browser sie dekodieren kann. HEIC, TIFF und andere Spezialformate sind nicht browserübergreifend garantiert; bei Bedarf zuerst als PNG/JPEG/WebP speichern. PDF/PSD sind keine unterstützten Bildimporte.
- Animationen werden als einzelnes Standbild verarbeitet.
- Höchstens 25 MB pro Bild und 50 Megapixel Quellauflösung. PNG-/JPEG-/GIF-Abmessungen werden nach Möglichkeit schon vor dem Dekodieren geprüft.
- Für die Konturen wird auf höchstens 2.400 Pixel pro Seite und insgesamt 4.000.000 Pixel verkleinert. Eine Verkleinerung wird im Dialog genannt. Eine höhere Dateiauflösung bedeutet deshalb nicht unbegrenzt feinere Vektoren.
- Transparenz wird bei Alpha 128 in deckend/transparent aufgeteilt. Halbtransparente Farbflächen werden nicht als Drucktransparenz erhalten.
- Fleckenfilter: Aus, Leicht (<4 Pixel), Normal (<12 Pixel), Stark (<40 Pixel), bezogen auf die Verarbeitungsauflösung. Kleine Farbinseln erhalten die häufigste angrenzende Farbe; transparente Löcher werden nicht automatisch gefüllt.
- Höchstens 50.000 Außenflächen und 16 Millionen Zeichen für die erzeugte Bild-SVG. Der Editor verarbeitet die Rasterflächen je Druckfarbe gebündelt, während die einzeln bearbeitbaren Regionen in der Quelle erhalten bleiben. Das Projektlimit von 2.500 gespeicherten Vektorgruppen / 100 Motiven gilt zusätzlich. Übermäßige Komplexität wird mit einer Fehlermeldung abgewiesen; gegebenenfalls weniger Farben oder eine kleinere Bilddatei verwenden.
- Jeder Berechnungslauf kann abgebrochen werden. Änderungen/Schließen beenden den bisherigen Worker, nach 30 Sekunden wird ein hängender Lauf mit Hilfetext beendet. Eine alte Vorschau lässt sich während Neuberechnung nicht übernehmen.

## Speicherung und Export

Das Projekt enthält das vektorisierte SVG und seine Pfade. Das Pixelbild wird nicht eingebettet; für eine neue Vektorisierung die Originaldatei erneut öffnen. Bestehende SVG-/Textprojekte bleiben lesbar. Entfernte Flächen werden auch aus der gespeicherten SVG-Quelle entfernt und bleiben nach erneutem Öffnen entfernt.

Die bestehende boolesche Farbtrennung berechnet die sichtbaren Regionen. Erst danach werden Druckfarben zugeordnet. PDF und SVG enthalten schwarze, deckende Vektorflächen mit denselben physischen Maßen und Passkreuzen. Vergrößern erzeugt keine zusätzlichen Bilddetails.

Im eingebetteten Codex-Browser ist die automatische Dateispeicherung weiterhin nicht zuverlässig über ein Download-Ereignis bestätigt; erzeugte Dateien erscheinen als anklickbare Links. Für Speichern/Drucken die App-Adresse in Chrome/Safari öffnen. Der physische Foliendruck und die Belichtung bleiben manuell zu prüfen.

## Umsetzung

Farben werden deterministisch über ein gewichtetes OKLab-Clustering reduziert; transparente/entfernte Hintergrundpixel verbrauchen keine Druckfarbe. Danach werden kleine zusammenhängende Farbinseln bereinigt und deren Konturen mit [ImageTracerJS 1.2.6](https://github.com/jankovicsandras/imagetracerjs) nachgezeichnet (Unlicense/Public Domain). Außenkonturen und Löcher werden gemeinsam mit `evenodd` ausgegeben. Für den Texturstil werden exakte Pixelzellgrenzen als M/L/Z-Konturen übernommen. Ein enger Bild-SVG-Importer prüft erlaubte Attribute, Maße, ganzzahlige Rasterkoordinaten, Rechenbudget und überlappungsfreie Farben per Scanline. Er vertraut keinem gespeicherten Raster-Flag. Der Geometrie-Editor erhält zusammengesetzte Pfade je Druckfarbe; die Quell-SVG behält einzelne Außenflächen einschließlich ihrer Löcher. Glatte Konturen durchlaufen weiterhin den allgemeinen SVG-Importer. Knockout bearbeitet nur Konturen nahe hinzugefügten Motiven; entfernte Löcher und Sprenkel bleiben unverändert. PDF-Operatoren werden in begrenzten Blöcken geschrieben, damit viele Rasterpunkte den Export nicht überladen.

Beispielbilder für eigene Versuche liegen unter `examples/images/`. Neutrale Projektdateien, zweifarbige Film-SVGs und mehrseitige PDFs liegen unter `examples/textures/`. `npm run samples:textures` erzeugt sie aus den deterministischen Testmustern in `src/test/helpers/texture-fixture.ts` neu. Die Muster enthalten keine importierten Motive oder privaten Quelldateien.
