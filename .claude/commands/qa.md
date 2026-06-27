Fuehre ein vollstaendiges QA-Audit dieser Website durch:

## 1. SEO-Check
- Meta-Tags (title, description, OG-Tags) auf jeder Seite pruefen
- Structured Data / JSON-LD vorhanden und valide?
- Sitemap.xml und robots.txt vorhanden?
- Canonical-Tags gesetzt?
- Local SEO: NAP-Konsistenz (Name, Adresse, Telefon)

## 2. Barrierefreiheit (BFSG/WCAG 2.1 AA)
- Semantisches HTML (Headings, Landmarks, Listen)
- Alt-Texte auf allen Bildern
- Farbkontraste mindestens 4.5:1
- Tastaturnavigation funktional
- ARIA-Labels wo noetig
- Focus-Styles sichtbar

## 3. Security
- CSP-Header gesetzt?
- Keine Secrets im Code (grep nach API-Keys, Passwoertern)
- HTTPS erzwungen?
- X-Frame-Options, X-Content-Type-Options gesetzt?

## 4. DSGVO
- Impressum und Datenschutzerklaerung vorhanden und verlinkt?
- Keine externen Fonts/Scripts ohne Consent?
- Kontaktformular: Hinweis auf Datenverarbeitung?
- Keine Google Analytics/Tracking ohne Consent?

## 5. Performance
- Bilder optimiert (WebP/AVIF, richtige Groessen)?
- CSS/JS minimiert?
- Lazy Loading fuer Bilder below-the-fold?
- Keine unnoetige JS-Bundles?

Erstelle eine Zusammenfassung mit Status-Ampel pro Bereich und priorisierter Aktionsliste.

Fokussiere auf: $ARGUMENTS
