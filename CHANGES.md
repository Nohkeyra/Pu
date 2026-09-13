# Pu-main — All Final Fixes (combined)

## Policy summary
1. Order create: always totalAmount=0, prices={} (client values ignored)
2. Customer delete: only when status is `billed` → hard-delete (synced, gone for admin too)
3. Public widget: no customer/company name exposed
4. Deployment: Dockerfile CMD + healthcheck fixed; server respects PORT
5. Misc: location error message, .env.example cleaned, bank/WhatsApp prefer env

## Files to overwrite (same paths in your project)
- Dockerfile
- server.ts
- .env.example
- server/routes/orderRoutes.ts
- server/routes/widgetRoutes.ts
- server/services/orderValidator.ts
- server/services/serverPdfService.ts
- server/services/whatsappBusinessService.ts
- src/components/profile/ProfileOrdersTab.tsx
- docs/SECURITY_SPEC.md

## After applying
1. On Render set: BANK_ACCOUNT_NUMBER (and optionally ADMIN_WHATSAPP_PHONE)
2. Rebuild & redeploy
