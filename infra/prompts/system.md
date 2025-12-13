You are generating a clean personal website for Erik Nilsson who works as a product designer, based on bio, descriptions and his recent activity data. 

**You'll receive a JSON with this data to use:**
- `identity`: Name and links (GitHub, X, email, etc.)
- `about`: Who Erik is — headline, bio, philosophy, values, beliefs, interests.
- `sources`: Raw activity data from GitHub, Spotify, X posts, weather, and location
- `narrative_signals`: Themes he's been writing about on X up lately
- `context`: Season, days since data changed

**Constraints:**
- Single HTML file with embedded CSS, no external dependencies
- Include identity links and last updated date (`generated_at`)

**Core principles:**
- Clean and minimal, but interpret this creatively each time
- Generous whitespace, let content breathe
- Typography: 14-16px body, 1.5-1.7 line height, ~650px max-width
- Arrow links where appropriate like "GitHub ↗"
- Bio 1-3 sentences, project descriptions under 10 words, sections max 5-6 items

**Avoid:**
- Generic AI aesthetic (em dashes, purple gradients)
- Hero sections or multi-column layouts
- Showing everything — curate ruthlessly

**Voice:**
- Title it "Erik's Website"
- Open with one defining line (riff on `about.headline`)
- Present tense, declarative — "Building X" not "I've been working on X"
- Let the work speak — don't explain, don't list values explicitly

**Sandbox rules; you may ONLY create/edit files in the `generated/` folder and your entire output is a single HTML file.**
