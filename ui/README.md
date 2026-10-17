# Website UI, login effects, and animated emoji guide

This note describes the current UI implementation and where the animated emoji files live.

## UI style

The site uses a dark, mobile-first interface with **glassmorphism**: translucent dark cards, thin light borders, soft shadows, background blur, and small animated highlights. Product cards and dashboard cards use related glass-style treatments.

Main source files:

- `tg selling/src/main.jsx` — React login screen, `LottieIcon` component, and UI that references emoji files.
- `tg selling/src/styles.css` — login background, card, and general UI styling.
- `tg selling/src/feature-fixes.css` — later CSS adjustments for other UI components.
- `tg selling/public/` — background videos, posters, and image assets.

## Login background animation

The login screen layers these elements, from back to front:

1. A full-screen video: `tg selling/public/splash.webm`, with `tg selling/public/splash.mp4` as a fallback. It is set to autoplay, stay muted, and loop.
2. A dark gradient overlay (`.veil`) that improves text contrast over the video.
3. The login card (`.login-card`), placed above the video and overlay.
4. A purple radial glow inside the card. Moving the pointer updates the glow's position (`handleMove` in `main.jsx`); the glow itself is defined by `.mouse-glow` in `styles.css`.

The video is the main continuously animated login background. The card's purple highlight follows pointer movement; it is not a separate looping background animation.

### Login card transparency

The base `.login-card` rule in `styles.css` uses:

```css
background: rgba(20, 25, 49, 0.44);
backdrop-filter: blur(18px);
```

So the background fill has **44% opacity** (nominally **56% transparent**) and blurs the video behind the card by **18px**. The exact appearance depends on the dark video frame and the dark gradient overlay beneath the card.

There is another `.login-card` rule in the same stylesheet that specifies a lighter 5.5%–18% gradient and 30px blur. However, that rule currently starts with the literal `\n+` text before the selector, so it is malformed CSS and should not be treated as the active setting. This guide records the base rule as the current configured transparency; no UI styling was changed while writing this guide.

On narrow screens, the card's CSS reduces its padding and corner radius.

## How animated emoji work

The site uses Telegram-style animated stickers exported as **Lottie JSON**, rendered with the `lottie-web` package:

- `LottieIcon` is in `tg selling/src/main.jsx`.
- It loads the JSON as an SVG, starts playback automatically, and loops by default.
- Use the `size` prop to set its width and height in pixels.
- `DeviceIcon` can render a Lottie emoji where one is supplied, with a standard icon as its alternative.

Example:

```jsx
<LottieIcon src="/icons/new/welcome-emoji.json" size={24} />
```

The URL starts at the Vite `public` folder. The matching file for that example is:

```text
tg selling/public/icons/new/welcome-emoji.json
```

To add another animated emoji:

1. Find its original JSON in `emoji1/` (folder layout below).
2. Copy the JSON into `tg selling/public/icons/new/` and give it a readable filename, for example `my-emoji.json`.
3. Reference it in `main.jsx` as `<LottieIcon src="/icons/new/my-emoji.json" size={24} />`.

Use the `.json` file for `LottieIcon`. The `.png` is a static preview; `.tgs` is Telegram's raw compressed sticker; `.lottie` is a packaged animation format, not the plain JSON expected by this component.

## Where the emojis are

Here are three useful locations:

| What you need | Folder |
|---|---|
| Original emojis supplied in the uploaded pack, organized by Telegram file ID | `emoji1/` at the workspace root |
| App-ready emoji and icon assets referenced by the website | `tg selling/public/icons/new/` |
| Code that chooses and displays the emoji | `tg selling/src/main.jsx` |

The original pack has **128 emoji folders**. Each folder name is the Telegram file ID, and the animation JSON inside uses that same ID:

```text
emoji1/
  <telegram-file-id>/
    <telegram-file-id>.json
    <telegram-file-id>.png
    <telegram-file-id>.tgs
    <telegram-file-id>.lottie
```

For example, an original ID such as `CAACAgUAAxUAAWps78tZIbBxH9AeMakQlT-17vhGAALBGAAC0OSoVt5MSz7-hRzRPQQ` is stored under a folder with that exact name:

```text
emoji1/CAACAgUAAxUAAWps78tZIbBxH9AeMakQlT-17vhGAALBGAAC0OSoVt5MSz7-hRzRPQQ/
```

Once an emoji is copied into `public/icons/new/`, the website normally uses its readable filename rather than the original Telegram ID. The original pack and the website's renamed files are therefore separate locations.

### Known original-pack-to-website names

These mappings are recorded in the project's existing handoff notes:

| Website file | Original `emoji1/` folder ID | Appearance / use |
|---|---|---|
| `today-sales.json` | `CAACAgUAAxUAAWps78tZIbBxH9AeMakQlT-17vhGAALBGAAC0OSoVt5MSz7-hRzRPQQ` | Red rising chart; sales stat |
| `monthly-sales.json` | `CAACAgUAAxUAAWps78tw-tTNGv-_AWkBB4se3kxHAAI8FAACrs2IVjujX9BK8deYPQQ` | Green money bag; monthly sales stat |
| `active-keys.json` | `CAACAgUAAxUAAWps78v1wVhSNC8jxf3atRiQ3Ff5AAKLHAACVsSJVhdpTjjfxkO5PQQ` | Rainbow crystal; active-keys stat |
| `crown.json` | `CAACAgUAAxUAAWps78sKzdgs8SQQIIBR1dWe4lBOAAJbFQACuBCIVvFbNQUTzOI9PQQ` | Gold crown; dashboard admin button |

Other emoji in the uploaded pack remain available under their ID-named folders, whether or not they have been copied into the website.

## Animated emoji on the login screen

The login component references these app-ready files from `tg selling/public/icons/new/`:

| UI location | Referenced JSON |
|---|---|
| Welcome heading | `welcome-yoda.json` |
| Sign-in heading | `signin-flame.json` |
| Phone-number label | `phone-spidey.json`, `phone-arrow.json` |
| Send OTP button | `send-flash.json` |
| Google login button | `google-lottie.json` |
| Bot login button | `telegram-lottie.json` |
| OTP heading | `otp-clipboard.json` |
| OTP security label and verification button | `shield-verify.json`, `verified-check.json` |
| API-key login button | `key-lottie.json` |

These names are the files the JSX references; they are not the original Telegram IDs.

## Finding all current emoji references

- Browse `tg selling/public/icons/new/` for the actual app-ready files.
- Search `tg selling/src/main.jsx` for `/icons/new/` to see which ones the UI references.
- Browse `emoji1/` for the original uploaded pack, with each Telegram ID as a folder name.
- `tg selling/mind.md` has additional notes about using Lottie icons and some existing emoji mappings.
