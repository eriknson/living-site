---
title: "A living site"
slug: "a-living-site"
publishedAt: "2025-12-26"
status: "published"
notionPageId: "2d714bfe-df48-8128-9c47-dc1a07b84e53"
---

I wanted to try making a website that rebuilds itself by spawning Cursor agents via GitHub Actions. CI as the runtime, a cron schedule that initiates every morning, no user interaction needed. The agents maintain the site. And this is how I built it.

```ascii art
Cron          GitHub Actions        Cursor CLI          Repository
 │                  │                    │                   │
 │───trigger───────►│                    │                   │
 │                  │                    │                   │
 │                  ├── fetch GitHub     │                   │
 │                  ├── fetch Spotify    │                   │
 │                  ├── fetch X (Typefully)                  │
 │                  ├── fetch weather (lol)                  │
 │                  │                    │                   │
 │                  ├── curator agent    │                   │
 │                  │   └► brief.json    │                   │
 │                  │                    │                   │
 │                  │ ┌──────────────────┤                   │
 │                  │ │ matrix: 4 models │                   │
 │                  │ ├──────────────────┤                   │
 │                  ├─┼─► cursor-agent -p (Opus)             │
 │                  ├─┼─► cursor-agent -p (Composer)         │
 │                  ├─┼─► cursor-agent -p (Codex)            │
 │                  ├─┼─► cursor-agent -p (Gemini)           │
 │                  │ └──────────────────┤                   │
 │                  │                    │                   │
 │                  │◄── generated/* ────┤                   │
 │                  │    (sandboxed)     │                   │
 │                  │                    │                   │
 │                  ├── verify sandbox   │                   │
 │                  ├── git add generated/──────────────────►│
 │                  ├── commit + deploy ────────────────────►│
 │                  │                    │                   │
 │◄─────────────────┼────────────────────┼── site live ✓ ────┤
 │                  │                    │                   │
```


## Context

The daily workflow running is defined and running via `regenerate.yml`. It starts by pulling fresh data from multiple sources: GitHub activity, Spotify listening history, X posts (via Typefully), weather, and static identity files.

A dedicated agent (the "curator") runs first and produces a structured brief based on the raw data.

```

bash
cursor-agent -p --force --model composer-1 "$PROMPT"
```

This agent also receives a reference version of the live site. It extracts the semantic structure (headings, sections, links) and passes that along too. This gives the generators a visual and structural baseline. All the messy synthesis work is done upstream.

---


## The daily build

Every day at 6am UTC, `regenerate.yml` kicks off:

1. Context — Pull fresh data, compare against history, synthesize a brief.
2. Generate — Four models run in parallel, each writing to generated/.
3. Archive — Save outputs to public/builds/, update the manifest, commit. Deploys automatically via Vercel.
4. Learn (coming soon, maybe) — Usage data feeds back into context. What visitors engage with informs the next build. The loop becomes a flywheel.

The site is live before I wake up.

---


## Running agents in CI

The workflow uses a matrix to run four models in parallel:

```

yaml
strategy:
  matrix:
    model:
      - claude-4.5-opus
      - composer-1
      - gpt-5.1-codex
      - gemini-3-pro
```

Each model gets its own isolated workspace via `git worktree`. So the agents sees only what they need: the brief and the reference version of the site. No build history, no other models' outputs (which, in another direction, could be interesting to keep in context).

```

bash
# Create isolated workspace from current commit
git worktree add /tmp/clean-gen --detach HEAD

# Remove all build history so agent starts fresh
rm -rf /tmp/clean-gen/generated/*
rm -rf /tmp/clean-gen/public/builds/
```

Then each agent runs with a single command:

```

bash
cursor-agent -p --model $MODEL "$PROMPT"
```

The `-p` flag means non-interactive. No confirmations, no waiting. The agent reads the brief, generates the output, done.

Four models, four different takes.

---


## The system prompt

The system prompt is where the creative direction lives. It tells the agents what kind of site to build, what tone to use, what aesthetic to aim for.

This is the most dynamic part of the system. You can approach it several ways:

- Fixed direction — a static prompt that stays the same. "Build a brutalist personal site." The agent interprets it fresh each day with new data, but the creative direction is stable.
- Dynamic prompts — pull the prompt from an API or generate it based on context. Tie it to the season, current events, or whatever you're working on.
- No direction — let the agents run free. Give them the data and let them decide what to build. Surprising results, but less control.

The prompt is just a markdown file in the repo, so updating it is a single commit.

To experiment with this, I also built an iOS Shortcut that lets me update the system prompt from my phone. Tap, type a new direction, and it commits directly to the repo. The next scheduled build picks it up.

<tweet>https://twitter.com/flowstated/status/2000691637190861180</tweet>

---


## Sandboxing

When you give AI agents write access to your repo, you need some guardrails to keep what they can update focused.

In my setup, agents can only write to `generated/`. Nothing in there can affect the actual application. The generated files are treated as artifacts, not source code.

This pattern scales to any use case. For a product landing page, the sandbox might be `public/generated-pages/`. For documentation, `docs/auto-generated/`. For a dashboard, `src/generated-components/`. The principle is the same: define a boundary, enforce it, and let agents operate freely within.

Enforcement happens at multiple layers. The prompt itself includes the constraint:

```

markdown
You may ONLY create or modify files inside the generated/ folder.
```

After the agent runs, a verification step checks for violations:

```

bash
git diff --name-only | grep -v '^generated/' && exit 1
```

If anything outside the sandbox changed, the build fails. Finally, the commit step only stages files in the sandbox:

```

bash
git add generated/
git commit -m "Regenerate site"
```

Everything else is ignored.

---


## Shadow DOM

How do you render arbitrary HTML inside a Next.js app without style conflicts?

Shadow DOM solves this elegantly. It's a browser API that creates an isolated DOM subtree with its own style scope. Styles inside can't leak out, and styles outside can't leak in. But unlike iframes, the content is part of the same document, so scrolling works naturally.

```

javascript
const shadow = container.attachShadow({ mode: "open" });
shadow.innerHTML = `<style>${css}</style>${body}`;
```

Complete style isolation. Native scrolling. No iframe jank.

The trick is rewriting CSS selectors. Generated content targets `body`, but inside Shadow DOM, we need to target our wrapper:

```

javascript
function rewriteBodySelectors(css: string): string {
  return css
    .replace(/\bbody\s*\{/g, "body, .shadow-root {")
    .replace(/\bbody(\.[a-zA-Z_-][\w-]*)\s*\{/g, "body$1, .shadow-root$1 {");
}
```

This makes Shadow DOM practical for rendering user-generated or AI-generated content in any React app. You get the isolation benefits of iframes without the nested scrolling issues or performance overhead.

---


## Takeaways

**CI is a great place for agents.** Headless, reliable, scalable. No user interaction needed. Just run, verify, commit.

**Multi-model comparison is fun.** Seeing how different models interpret the same prompt reveals their personalities. Opus goes deeper. Codex experiments more. Composer is lightning fast. 

**Layered synthesis works.** Split up the workflow and tasks for agents in steps to keep it in control. Unle

<tweet>https://twitter.com/flowstated/status/2004644541350211634</tweet>

---


## Beyond personal sites

The broader idea is that any website can be living. Products, marketing sites, documentation. The pattern is the same: aggregate context, synthesize a brief, let agents generate.

Imagine a product landing page that adapts to seasonality, current events, or what the team just shipped. Or documentation that updates itself when your API changes. Or a changelog that writes itself from your commit history.

The infrastructure is the same. The constraint is the same. Only the data sources and creative direction change.

We're early, but the primitive is there: agents running on a schedule, sandboxed to specific outputs, producing artifacts that humans review or deploy automatically. Joy: Sparked.

---


## What's next

This is the fun part and it's still a work in progress. Some things I'm exploring:

- Let visitors remix the site themselves
- Make the site learn from what people click and view
- One agent updating multiple sites at once

---


## Until next time 👋

If you're curious about the implementation, the source is on [GitHub](https://github.com/eriknson/living-site). And if you want to see today's version, just visit [the home page](https://eriks.design/).