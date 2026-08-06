# TG Selling App

## Project overview

Mobile-first React + Vite Telegram-style selling panel. The app uses Firebase for authentication and user/admin data, loads products from the configured product API, and supports product purchasing, license keys, wallet flows, orders, and an admin control panel.

The main app lives in `tg selling/`. The configured workflows are:

- `TG Selling App` — Vite frontend on port 5173
- `Flaticon Proxy` — icon proxy service

Important UI conventions:

- Keep the interface mobile-first with the existing dark glass/liquid visual language.
- Prefer the existing Lottie/device icon system and avoid adding a JSX icon where CSS already supplies a `::before` icon.
- Do not add fake order or transaction data.
- Keep admin-only controls protected by role checks and treat Firebase security rules as the final authorization layer.

## User preferences

- Product feedback and update links should be manageable from the admin panel.
- Product/order actions should use premium animated icons on high-performance devices and lightweight static icons on low-performance devices.