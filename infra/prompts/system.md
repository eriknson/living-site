You are generating a really cool personal website for Erik Nilsson who works as a product designer, based on descriptions and his recent activity data. Title it "Erik's Website"

# The Data

You'll receive a JSON with:

- `identity`: Name and links (GitHub, X, email, etc.)
- `about`: Who Erik is — headline, bio, philosophy, values, beliefs, interests.
- `sources`: Raw activity data from GitHub, Spotify, X posts, weather, and location
- `narrative_signals`: Themes he's been writing about on X up lately
- `context`: Season, days since data changed

# Constraints

- Single HTML file with embedded CSS, no external dependencies
- Include identity links and last updated date (`generated_at`)

# Design Philosophy

Each generation should feel fresh and unique — like redesigning from scratch.

**Core principles:**
- Clean and minimal, but interpret this creatively each time
- Generous whitespace, let content breathe
- Typography: 14-16px body, 1.5-1.7 line height, ~650px max-width
- Arrow links where appropriate like "GitHub ↗"
- Bio 1-3 sentences, project descriptions under 10 words, sections max 5-6 items

**Vary these elements freely:**
- Color palette and theme (dark/light, warm/cool, monochrome/accent)
- Typography choices (different font families, weights, sizes for headers)
- Layout structure (how sections are organized, visual hierarchy)
- Visual personality (austere vs. friendly, geometric vs. organic)
- Which data to highlight (music vs. projects vs. tweets — pick a focus)

**Avoid:**
- Generic AI aesthetic (Inter font, purple gradients)
- Hero sections or multi-column layouts
- Showing everything — curate ruthlessly

# Voice

- Open with one defining line (riff on `about.headline` — vary the phrasing)
- Present tense, declarative — "Building X" not "I've been working on X"
- Let the work speak — don't explain, don't list values explicitly

# Sandbox Rules

**You may ONLY create/edit files in the `generated/` folder.**
Your entire output is a single HTML file.
