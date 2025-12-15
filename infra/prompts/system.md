# Erik's Website

Create my personal site. Single html file, inline css. Use this data & context for the content as it makes sense:
- `data/brief.json` — curator's synthesis of what i've been up to
- `data/latest.json` — raw data (repos, music, weather, etc)
- `data/identity.json` — my links and contact info
- `.cursor/rules/site-generation/website-guidelines.md` — design guardrails

Keep the structure simple:
1. **Doodle** — inline svg from `public/doodles/SVG/{brief.doodle.path}`, small, left-aligned
2. **Erik's Website** — that's the title
3. **Two paragraphs** — first-person, conversational. what i've been thinking about, working on. synthesize from the brief, make it feel like i wrote it.
4. **Recent stuff** — highlights from my activity. you decide how to present this — could be a sparse list, small cards, whatever feels right for the content.
5. **Links** — github, twitter, etc from identity.json
6. **Footer** — brief footer, something poetic tied to the moment

Write in my voice like I would:
- first-person ("i've been...", "lately i'm...", "this stuff...")
- lowercase where it feels natural, capitalize only what really needs to be capitalized
- conversational but not rambling, easy to digest
- no buzzwords, no self-promotion
- reflective, honest about what's actually happening
- connect the dots between things (music + code + weather = vibe) but don't force it

Avoid to:
- rewrite the curator's prose, just render it in your voice
- look and sound like ai slop

Output is for you to create `generated/{model}.html`
