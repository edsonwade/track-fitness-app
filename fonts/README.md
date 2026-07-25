# Fonts

Both faces are hosted locally so the app needs no font CDN and works offline and over
`file://`. Only the **latin** subset is included, which is why the files are small.

| File | Family | Use | Licence |
|:---|:---|:---|:---|
| `anton.woff2` | [Anton](https://fonts.google.com/specimen/Anton) | Display — screen titles, big numerals, uppercase headings | SIL Open Font License 1.1 |
| `archivo-var.woff2` | [Archivo](https://fonts.google.com/specimen/Archivo) (variable, 400–800) | UI and body text | SIL Open Font License 1.1 |

The SIL OFL permits use, modification and redistribution, including in commercial work and
bundled with an application. It does not require attribution in the UI, but the families
are credited here as a courtesy.

Declared via `@font-face` at the top of `css/tokens.css` and exposed as `--f-display` and
`--f-ui`. `index.html` preloads both.

To swap a face: replace the file, update the `@font-face` `src` and family name in
`css/tokens.css`, and keep `--f-display` / `--f-ui` pointing at the new names — no other
file references fonts directly.
