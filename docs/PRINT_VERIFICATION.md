# Erster Foliendruck — noch manuell zu prüfen

Die digitalen Tests überprüfen Dateimaße und Vektoren. Sie bestätigen weder Druckermaßstab noch ausreichende UV-Deckkraft. Die folgenden Schritte müssen auf deinem Drucker und deinen Folien durchgeführt werden.

1. Öffne `examples/films/Kalibrierung-100mm.pdf`. Das Quadrat ist an seinen äußeren Kanten exakt 100 × 100 mm groß.
2. Wähle A4, tatsächliche Größe / 100 %. Deaktiviere „An Seite anpassen“, Skalierung und randlosen Druck, falls dieser automatisch vergrößert. Teste zuerst auf Papier.
3. Messe äußere Breite und Höhe. Vorläufige Ziel-Toleranz: jeweils **100,0 ± 0,5 mm**. Das ist ein vorgeschlagenes Abnahmekriterium, kein zugesichertes Druckerergebnis. Bei Abweichungen Druckdialog und Treiber prüfen; nicht automatisch eine Achse verzerren.
4. Drucke die drei Seiten aus `examples/films/Grow-your-own.pdf` auf geeignete Transparentfolie. Gleiches Papierformat, gleiche Ausrichtung und gleiche Einstellungen für alle Seiten. Eine Seite entspricht einer Druckfarbe.
5. Lege die Folien übereinander. Alle vier Passkreuze müssen gemeinsam ausgerichtet sein. Prüfe den Passer an Blütenblatt/Kreis und Gesicht; halte die Folien plan. Vorläufiges Ziel: maximal 0,5 mm Versatz. Für feine Details kann eine strengere Toleranz nötig sein.
6. Prüfe, ob dein Drucker alle Passkreuze ausgibt. FRAME reserviert 5 mm Druckrand, dein Gerät kann mehr benötigen. Bei Bedarf Motiv verkleinern/verschieben oder größeres Papier nutzen. Kein automatisches Fit-to-page verwenden.
7. Kontrolliere gegen Licht und mit einem Belichtungstest, ob schwarze Bereiche ausreichend UV-Licht sperren. Einstellungen für hohe Schwarzdeckung, Folie, Drucker und Emulsion müssen zusammenpassen. Sichtbar dunkle Folie allein beweist keine ausreichende UV-Deckkraft.
8. Entscheide anhand deines Aufbaus, ob die bedruckte Seite direkten Kontakt braucht und Spiegelung erforderlich ist. Die App spiegelt standardmäßig nicht. Belichte und prüfe ein kleines Testmotiv vor der gesamten Auflage.

## Messprotokoll

| Prüfung | Ergebnis |
| --- | --- |
| Datum, Drucker, Treiber, PDF-Programm | Offen |
| Folientyp / Druckeinstellung | Offen |
| Quadrat Breite / Höhe | Offen |
| Passkreuz-Versatz | Offen |
| Filmopazität / Belichtungszeit | Offen |
| Erfolgreiche Siebbelichtung und Probedruck | Offen |

**Status: Ausstehende Nutzerprüfung. Es wurde kein physischer Druckerfolg behauptet.**
