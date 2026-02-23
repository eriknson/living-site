---
title: "Surgical edits"
slug: "surgical-edits"
publishedAt: "2025-11-23"
status: "published"
notionPageId: "2d714bfe-df48-8144-a58f-e53b7e9f6bdb"
---

There's always been this gap between seeing something in the browser and changing it. You notice a typo, a margin that's off, a color that doesn't feel right. Then you switch to your editor, reference the component and context, phrase the edit, send it, wait for the dev server to reload. By the time you're done, you've lost the thread of whatever you were actually working on.

I wanted to try closing that gap. Point at an element, describe what you want, see the change. Without leaving context.

```plain text
Browser          Overlay          API Route         cursor-agent      Files
   │                │                 │                  │               │
   │─select elem───►│                 │                  │               │
   │                │                 │                  │               │
   │                │─POST context───►│                  │               │
   │                │                 │                  │               │
   │                │                 │─spawn agent─────►│               │
   │                │                 │                  │               │
   │                │                 │                  │─edit file────►│
   │                │                 │                  │               │
   │◄───────────────┼─────────────────┼──────────────────┼───HMR reload──┤
   │                │                 │                  │               │
```


## How it works

The idea combines two things: [React Grab](https://www.react-grab.com/?ref=eriks.design) (s/o [aiden](https://x.com/aidenybai)) and [cursor-agent](https://cursor.com/cli?ref=eriks.design).

When you click an element, the overlay figures out which React component rendered it. It grabs the file path, the component name, the props, and the surrounding context. All the stuff you'd normally have to hunt down manually.

Then it sends the context to an API route running on your dev server. The route spawns `cursor-agent` with a prompt that includes everything it needs to make a targeted edit. No guessing, no searching. The agent knows exactly where to look.

<tweet>https://twitter.com/flowstated/status/1992678167052722278</tweet>

---


## The overlay

The overlay is a React component you add to your root layout. It only renders in development, so there's no production overhead.

When active, it highlights elements as you hover and lets you select them. Think of it like the browser devtools element picker, but instead of inspecting, you're setting up an edit.

```

typescript
import dynamic from 'next/dynamic';

const ShipflowOverlay = dynamic(() =>
  import('@shipflow/overlay').then((mod) => ({
    default: mod.ShipflowOverlay,
  }))
);

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <ShipflowOverlay />}
      </body>
    </html>
  );
}
```

The overlay is invisible until you activate it. No UI clutter, no extra chrome. Just there when you need it.

---


## Cursor Agent

The interesting part is how the API route spawns the agent. The handler takes care of all the ceremony: finding the `cursor-agent` binary, building the prompt, managing timeouts, and streaming back the response.

```

typescript
// app/api/overlay/route.ts
import { createNextHandler } from '@shipflow/overlay/next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createNextHandler();
```

The handler looks for `cursor-agent` in your `PATH` and common installation spots. If it can't find it, you can set `CURSOR_AGENT_BIN` to the absolute path.

When the agent runs, it gets a prompt like: "In `components/Button.tsx`, the `Button` component has prop `variant='primary'`. Change the background color to blue." Everything the agent needs is right there in the context.

---


## Getting started

Run the init command in your Next.js project:

```

bash
npx shipflow-overlay init
```

This scaffolds the overlay component, the API route, and checks that `cursor-agent` is accessible.

Or set it up manually:

**1. Add the overlay to your root layout**

```

typescript
// app/layout.tsx
import { ShipflowOverlay } from '@shipflow/overlay';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <ShipflowOverlay />}
      </body>
    </html>
  );
}
```

**2. Create the API route**

```

typescript
// app/api/overlay/route.ts
import { createNextHandler } from '@shipflow/overlay/next';

export const POST = createNextHandler();
```

**3. Start your dev server**

```

bash
npm run dev
```

The overlay activates with a keyboard shortcut. Select an element, describe the change, and watch the agent make the edit.

---


## The point

The gap between intent and action is where momentum dies. Every context switch, every file search, every "where was that component again?" is friction.

This setup tries to eliminate that friction for visual edits. You see it, you point at it, you describe what you want. The agent does the rest.

It's still early and definitely rough around the edges. But the core loop works.

---


## Until next time 👋

The source is on [GitHub](https://github.com/eriknson/shipflow). Try it out and let me know how I can make it better.