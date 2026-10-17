# Login Screen UI Notes

This guide covers only the login screen's visual style, motion, and animated emoji placement.

## Visual format

- **Style:** dark, cinematic background with a centered frosted-glass card.
- **Background:** a full-screen video that autoplays silently and loops. A dark gradient overlay sits above it so text and form controls stay readable.
- **Card:** centered, maximum width about 420px, 28px rounded corners on desktop, thin light border, and a soft shadow.
- **Card transparency:** `rgba(20, 25, 49, 0.44)`. The card fill is **44% opaque** (about **56% transparent**); `backdrop-filter: blur(18px)` blurs the moving background visible through it.
- **Pointer effect:** a soft purple radial glow moves to the pointer's position inside the card. It is a responsive highlight, not another looping animation.
- **Mobile layout:** reduce the card padding and use 24px corners on narrow screens; keep the form full-width and prevent horizontal overflow.

## Login motion

1. The background video provides the continuous movement.
2. The dark overlay keeps the card legible over bright or changing frames.
3. The purple glow follows pointer movement on desktop and remains decorative.
4. Button hover effects should stay subtle so they do not distract from entering login details.

## Animated emoji placement

Animated emoji are Lottie JSON animations rendered inline with the login text and controls. They are used as small visual accents beside:

- The welcome and sign-in headings
- The phone-number field and send-code button
- Alternate sign-in buttons
- The verification heading and action
- The private-key sign-in action

Keep each animation close to the text or button it explains. Typical sizes are 18–28px; use a larger size only for a standalone status illustration.

To apply an animated emoji:

1. Use the emoji's **Lottie `.json`** animation file.
2. Place it beside the relevant heading, field label, or button label.
3. Render it through the reusable Lottie icon component so it starts automatically, loops, and is cleaned up when the UI unmounts.
4. Set its size to match the surrounding text; keep the label itself visible so the emoji is not the only way to understand the action.

Example:

```jsx
<LottieIcon src="/path/to/emoji.json" size={24} />
```

## Readability and behavior

- Keep the dark overlay and form text contrast strong against every video frame.
- Keep input and button focus states visible on top of the glass effect.
- Treat emoji as decorative; the adjacent label must carry the meaning.
- Avoid making the video, glow, or emoji motion compete with the login action.
