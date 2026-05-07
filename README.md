This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## T800 Biometric Setup

Use these environment variables for the dedicated T800 attendance bridge:


Note: Set `T800_ONLY=true` in the server env to disable legacy biometric endpoints and switch the kiosk to T800-only mode. Both the web kiosk and the T800 device are expected to use Wi‑Fi to reach the bridge/server.

Quick test (send a simple JSON realtime log to the T800 adapter):

```bash
curl -v -X POST "${HRMS_URL:-http://localhost:3000}/api/attendance/t800" \
	-H "Content-Type: application/json" \
	-H "x-kiosk-api-key: ${KIOSK_API_KEY:-}" \
	-d '{"request_code":"realtime_glog","user_id":"12345","io_time":"20260507 08:30:00","io_mode":"IN","deviceId":"T800-001"}'
```

For multi-block encrypted uploads follow the device SDK protocol (headers: `dev_id`, `request_code`, `blk_no`, `encrypt`) — the T800 adapter buffers blocks and ACKs partial chunks, matching the FK SDK behavior.

Run the bridge with:

```bash
npm run biometric:bridge
```
