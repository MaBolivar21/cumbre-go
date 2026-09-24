# Group optional date / approved prototype refinements

## Scope

The existing public entry remains `https://go.cumbresalvaje.mx/`. Its visitor selector maps Pareja, Familia and Amigos to the existing normal journey, and Escuela/Empresa to the group journey with the category preselected. This release does not modify index.html, normal pricing, promo catalog, n8n, authentication, or QR encoder.

Group updates: explicit "Aún no tengo fecha definida" option, accurate direct quantity input, corrected backward navigation (type -> need -> size), continuous progress indicator, photo-led category cards and compact experience cards matching the supplied reference. Seven actual input/review steps are shown, not an invented eight-step counter. Stay choices remain available. Existing promo capture, server folio, QR and user-initiated WhatsApp remain.

## Database migration already applied

Supabase migration: `group_optional_date_005`.

- `public.cumbre_go_solicitudes.fecha_visita` can be null only for `flujo='grupal'`, enforced by `cumbre_go_solicitudes_date_by_flow_check`.
- Group RPC accepts `group.date_unknown=true` only together with absent/null date. Otherwise a valid nonpast date is still required. Older dated clients remain compatible.
- Staff-only `cumbre_crm_update_v2` accepts group `fecha_visita` changes, with the same actor, revision, idempotency, transaction and history metadata mechanism. It refuses reservado/completado without a date. Normal request date editing is not expanded.
- Original customer payload, prices, deposits and existing requests are not rewritten. No sentinel date is used.
- SECURITY DEFINER, empty search_path, ownership and function grants are preserved. Group submit remains available to anon/authenticated; CRM write remains authenticated plus require_staff.

Definition hashes (MD5 of pg_get_functiondef): group submit `0586e0307d37eb6c1e786825c9a241fc` -> `a377974f1bc7fc6edbdfa20f47fb86eb`; CRM update `487d9658bc22c8776122449f75995fcd` -> `f55d22e6a450d66af677703d34538668`.

## Checks completed

Database transaction tests, rolled back: undated group submission; same-key same-folio retry; rejection of missing/malformed/contradictory date intent; no fabricated date/price/payment; undated CRM list/detail for Martha; block undated reservation; followup without date; signed/revisioned staff date change without auto-reserving; dated confirmed request returned by Agenda; original request preserved; normal dates still mandatory; compatibility with older dated group payloads.

Local Chromium DOM tests with network responses mocked: editable 80 and +/-; validation without silent rounding; preserving selections on backward navigation; date/unknown toggling and restoration; 14 activities; promo metadata; save-before-WhatsApp, matching folio and no repeated save from WhatsApp navigation; nonoverlapping content/footer. Mobile viewport checks at 390x844, 375x667 and 320x568. Both categories x four needs checked forward/back. CRM date-edit rendering, patch generation, signed-history display, undated-reserve refusal, and no date patch for normal requests checked with fixtures. Existing five visitor-type action mappings verified with mocked navigation. JavaScript syntax checked with node --check.

Browser policy blocked navigations; local checks used set_content with local assets and mocked transport. These checks are NOT a live public-URL end-to-end test. No Safari/iPhone physical-device test, outbound WhatsApp or real email-delivery test is claimed. Local fixture tests created no production leads. SQL tests were rolled back; sequence values may advance without committed rows.

## Acceptance on a real device

From the canonical app, select Escuela or Empresa; enter 80; choose no date; select experiences; review and submit a clearly marked QA request. Verify the same folio/date status in CRM and the WhatsApp preview. In CRM, use an authorized account to set the agreed group date and save a note; then verify that confirming a dated reservation includes it in Agenda. Do not treat a saved lead, promo request or suggested deposit as a confirmed payment/reservation.

## Rollback

Frontend baseline: `8524b577c817bb6b822444ba4862beab0c42764e`. Revert only this release's frontend changes through a reviewed commit. Keep the backward-compatible migration in place; do not restore NOT NULL or delete undated group leads after intake. A database reversal requires first auditing any newly created undated requests and reconciling them deliberately. Supabase migration history retains the applied SQL. Do not reset main or overwrite unrelated later commits.
