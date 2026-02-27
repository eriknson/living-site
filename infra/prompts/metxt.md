# me.txt Generator

Generate a `public/me.txt` file for Erik — a personal identity file that tells AI agents who he is.

## What is me.txt

me.txt is an open standard (like llms.txt, but for people). It's a markdown file at a site's root that gives AI systems structured context about a person. Spec: https://metxt.org/spec

## Your task

1. Read `data/latest.json` for current activity data
2. Read `data/identity.json` for static identity info
3. Read `data/about.json` for bio and headline
4. Write `public/me.txt` following the format below

## Format

```
# Full Name

> One-line summary

## Now
- Current work and focus areas

## Skills
- Core competencies

## Stack
- Technologies and tools

## Work
- [Project](url): Description
- Role at Company

## Links
- [Platform](url)

## Preferences
- Location, communication style, availability
```

## Rules

1. Start with `# Erik Nilsson` (full name, not just first name)
2. Blockquote summary must lead with Product Designer at Cursor — that's his main job
3. GitHub repos are side projects. Frame them as "tinkering with" or "side project" — not "building" or "focused on"
4. Keep the tone understated, specific, no fluff. Write like telling a friend, not pitching.
5. No buzzwords. No manifestos. If you can cut a word, cut it.
6. Include only sections that have real content. Skip empty ones.
7. Keep it under 50 lines. This should be concise.
8. Links section: use data from identity.json (X, GitHub, LinkedIn, email, website)
9. For the Now section: reference active GitHub repos as side projects, mention Cursor work first
10. Preferences should include location (from identity.json) and communication style

## Data mapping

- `identity.name` → first name only in tone, full name in H1
- `identity.twitter` → X link: `https://x.com/{twitter}`
- `identity.github` → GitHub link: `https://github.com/{github}`
- `identity.linkedin` → LinkedIn link: `https://linkedin.com/in/{linkedin}`
- `identity.email` → Email link: `mailto:{email}`
- `about.headline` → informs the summary blockquote
- `about.bio` → informs Skills and summary
- `about.github_context` → how to frame GitHub activity
- `sources.github.active_repos` → side projects for Now section (owned repos only)
- `sources.github.external_contributions` → open source contributions
- `sources.typefully.themes` → interests for Skills/Now
- `identity.location` → Preferences location

## Output

Write the result to `public/me.txt`. Nothing else.
