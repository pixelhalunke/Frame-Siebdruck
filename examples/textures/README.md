# Neutrale Texturbeispiele

Diese Beispiele werden aus den eigenen, deterministischen Testmustern in [texture-fixture.ts](../../src/test/helpers/texture-fixture.ts) erzeugt. Sie enthalten keine importierten Motive, Marken oder privaten Quelldateien.

- `Texture-dots`: regelmäßige Punkte mit einzelnen Löchern.
- `Texture-speckles`: versetzte Sprenkel mit unterschiedlichen Größen und Löchern.

Beide Muster haben 1122 × 1402 Pixel, zwei Druckfarben, geglättete Randpixel und mehrere tausend einzeln bearbeitbare Regionen. Die Tests vergleichen jede klassifizierte Pixelzelle mit den Vektoren vor und nach der Farbtrennung. Zusätzlich prüfen sie Flächenlöschung, Überlagerungen und schwarze, zweitseitige A4-Vektor-PDFs.

Beispiele nach der Installation neu erzeugen:

```sh
npm run samples:textures
```

Für jedes Muster entstehen eine `.frame.json`-Projektdatei, zwei schwarze Film-SVGs und ein zweitseitiges PDF. Der Mustergenerator und die daraus erzeugten geometrischen Testdaten gehören zum Projekt; eingebundene Bibliotheken behalten ihre eigenen Lizenzen.
