# Customer profile layout

Based on `Nohkeyra/Pu` commit `951888eee559f11c7fdc1f1156faa7470940358c`
(version 1.3.155). This change uses the existing theme, UI primitives and assets.

## User-facing changes

- A compact welcome and batik account summary uses the signed-in customer's
  actual name, visible order count and saved-location count. It contains no
  sample records. A dash is shown while each count is loading.
- Four consistent tabs: Orders, Profile, Locations and Preferences. The tabs
  support arrow keys, Home/End, selected state and associated tab panels.
- Order cards prioritize the event, date and guest count. View details retains
  the existing preview callback. Additional actions move into a labelled dialog;
  the existing status conditions, disabled states and confirmation callbacks
  are preserved, including selection for combined exports.
- Profile and location forms retain their existing fields and save callbacks.
  Location icon actions now have accessible names. An optional default-location
  action is displayed only when a working handler is supplied.
- Notification changes are saved explicitly with **Save preferences**. This
  replaces delayed callbacks that captured the previous switch values. The
  existing save operation and its success/error feedback remain responsible
  for persistence. Biometric controls keep their existing behavior.
- Dialog layering also supports the existing profile side panel.

The shared UI kit, global theme, navigation routes, data access, server,
authentication and document generation logic are not changed.

## Validation

The patch was checked with the repository lint, unit-test and production-build
commands. Browser checks render the actual edited React components with isolated
simulated account/native services; they do not access live customer data.
Checks cover both themes, four tabs, keyboard navigation, status-dependent actions,
dialog handoff/focus, order selection, captured preference/profile save payloads,
location editing, empty/loading/signed-out states and the side panel.
English layouts at 320px and 768px were checked for horizontal overflow and
reduced-motion behavior. This is not a physical Android-device test.

## Design references

- Order-card composition: https://dribbble.com/shots/20384658-Food-Delivery-Mobile-App-Order-History
- Account/list consistency: https://www.behance.net/gallery/171527113/Clower-Homemade-Food-App
- Component roles: https://developer.android.com/design/ui/mobile/guides/components/material-overview
- Accessible tabs: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

References informed the layout; their artwork, palettes and sample records are
not included. Wawasan's existing fonts, logo and batik asset remain in use.
