# Validation — feature extension, 9 September 2026

## Passed

- Production TypeScript check and Vite build.
- All 26 automated tests passed. They cover the original notebook behavior plus v1 migration, unknown metadata, failed writes, partly corrupt storage, stale writes, default/invalid fields, pinned restoration, read-only trash, permanent deletion, elapsed-time boundaries, search and sharing adapters.
- Exact retention tests: still recoverable one millisecond before 30 days; expired at 30 days; removed on a 35-day reload. Remaining labels cover 30, 12, 2 and 1 days, plus expiry and a future device clock boundary without negative counts.
- Chromium browser: loading three actual version 1 fixture records migrated the payload to version 2 under the same key. IDs, Arabic text, whitespace, timestamps and custom metadata remained intact; new fields were null/false.
- Search by a title and by a word in a different note's body, using `  sHoPpInG  `; both matched. Unmatched search showed No Notes Found; clearing restored the full list. A deleted matching note was excluded.
- Pinning an older note put it first; reload retained the pin. Unpinning restored last-edit order. Deleting a pinned note removed it from active results; reload retained it in Recently Deleted; recovery returned the same pinned note, including after another reload.
- Trash opened read-only with Recover and permanent-delete actions. Permanent-delete cancellation left the note intact. Confirmation removed it; reload confirmed it stayed absent. The empty trash state rendered correctly.
- Expiry fixtures at 30 and 35 days were removed on first app startup with all other app instances closed, and on a storage refresh. The remaining trash entries showed 30 days and 1 day. The fixture inspection UI confirmed expired records were absent from stored JSON.
- Partly damaged fixture data produced a visible storage warning and disabled note creation. Retry preserved the complete original raw payload, including the valid record; no overwrite occurred.
- Deleting the final active note showed No Notes and kept Recently Deleted accessible.
- Chromium browser: create through the plus button; textarea is focused immediately in the same interaction.
- Continuous typing after the extension: all 21 characters of a two-line new note arrived with focus retained and caret at position 21; reload retained the note.
- Arabic multiline editing and automatic RTL text direction.
- Done ends editing without creating an extra note or removing content.
- Refresh retains the notes, their derived titles and multiline content.
- Reopen and edit an existing note; latest-edit ordering and date update.
- Custom deletion alerts retained native modal semantics and initial Cancel focus.
- Real Share fallback opened the classic copy sheet. Copy Note wrote the complete Arabic/English multiline content to the browser clipboard, verified by reading it back; Copied appeared above the editor.
- With clipboard writes and Web Share deliberately denied by the narrow iframe's Permissions Policy, the copy sheet exposed a read-only, fully selected note. Manual Control+C copied all text. Cancel closed the sheet. The manual field fit at 320 pixels (284px client and scroll width).
- Native share payload, unavailable/denied sharing, quiet AbortError cancellation and missing/denied clipboard are covered by adapter-mock tests. These do not verify a native OS share sheet.
- Desktop presentation at a 1363 × 936 browser viewport: centered 390 × 660 app.
- Embedded viewport checks at 320 × 568, 390 × 740 and 667 × 375: app client/scroll widths matched at 320 and 667; the 390px editor client/scroll widths also matched. Text line height remains 32px. Search, trash navigation, remaining labels, added toolbar actions and the copy sheet were visually reviewed.
- The original implementation's earlier long-note test at 320px confirmed wrapping, caret-following scroll and ruled-paper alignment. This extension keeps the same textarea and paper rules; it did not repeat that long-note test.
- Keyboard-friendly semantic controls; native modal semantics; inactive screens use inert and aria-hidden. Escape handling and reduced-motion styles are present in source.
- No application console errors or warnings after fixes. The test environment's browser extension logged unrelated errors.
- The original same-tap creation focus mechanism is retained and was verified after these changes.
- The identifier generator works on both HTTPS and a development HTTP origin.
- All imagery, icons and visual effects are original to the project. The bundled font's license is included.
- The PWA manifest, original icons and generated service worker include every local build asset.

## Limits

- Browser testing used Chromium. Physical iPhone/Android keyboards, native OS share sheets, Safari, Edge, notched-device safe areas, OS installation and actual offline launches were not available to test directly.
- Successful offline use depends on a first online visit, service-worker support and the hosting authentication layer.
- Notes are local to a browser profile and site origin. No cross-device sync or simultaneous multi-tab merge is provided. Stale-write protection and write-failure handling were tested with storage adapters; storage-event refresh also ran in the real browser fixtures.
- Corrupt payloads are protected rather than automatically repaired. Retention depends on the device clock and on a writable browser store. A write failure is surfaced and cannot guarantee persistence until it succeeds.
- The design follows the written iOS 4–6 brief. No user-supplied original screenshot was available for a numerical pixel comparison.

`tests/fixtures.html` and `tests/responsive.html` are development-only harnesses, excluded from the production Vite entrypoint and build output. Only synthetic data on the internal development origin was used. The previous development data was restored afterward. No sample notes are seeded in the delivered app.
