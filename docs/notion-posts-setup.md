# Notion Posts Setup

This document explains how to set up the Notion database for managing blog posts.

## Database Schema

Create a database in Notion called **Posts** with the following properties:

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| **Title** | Title | The post title | Yes |
| **Slug** | Text | URL slug (e.g., `a-living-site`) | Yes |
| **Published** | Date | Publication date | Yes |
| **Status** | Select | `Published` or `Draft` | Yes |
| **External URL** | URL | For posts hosted elsewhere (optional) | No |

### Status Options

Create these options in the Status select:
- `Published` - Live on the website
- `Draft` - Not visible on the website

### Example Entry

| Title | Slug | Published | Status | External URL |
|-------|------|-----------|--------|--------------|
| A living site | a-living-site | 2025-12-26 | Published | |
| Go with the flow | go-with-the-flow | 2020-08-04 | Published | https://uu.diva-portal.org/... |

## Page Content

Each page's content is the post body. Write in Notion using:

- **Headings** (H2, H3) for sections
- **Paragraphs** for body text
- **Code blocks** with language specified
- **Images** uploaded directly or linked
- **Bookmarks** for embedding tweets (X links will be converted to `<tweet>` embeds)
- **Bullet/numbered lists**
- **Quotes** for callouts
- **Dividers** for section breaks

### Special Formatting

**Tweet Embeds:**
To embed a tweet, add a bookmark with the X/Twitter URL:
```
https://x.com/flowstated/status/1234567890
```
The sync will convert this to a `<tweet>` embed automatically.

**Images:**
- Upload images directly to Notion
- They'll be downloaded and hosted at `/posts/{slug}/`
- Add alt text using the caption feature

**Links:**
Regular links work as expected. External links open in new tabs.

## Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. You edit a post in Notion                                   │
│  2. Notion automation triggers webhook                          │
│  3. GitHub workflow runs sync                                   │
│  4. Agent formats content to match site style                   │
│  5. Changes committed and deployed                              │
│  6. Live on eriks.design in ~2 minutes                          │
└─────────────────────────────────────────────────────────────────┘
```

## Setting Up Notion Automation

1. Open your Posts database in Notion
2. Click **⚡ Automations** (top right, or "..." menu)
3. Create a new automation:
   - **Trigger:** "When a page is added" or "When a property is edited"
   - **Action:** "Send webhook"
   - **URL:** `https://eriks.design/api/notion-webhook`
   - Add header: `x-notion-secret: YOUR_SECRET_HERE`

## Environment Variables

Add these secrets to GitHub:

```
NOTION_TOKEN=secret_xxxxx           # Notion integration token
NOTION_DATABASE_ID=xxxxx            # Posts database ID
NOTION_WEBHOOK_SECRET=xxxxx         # Secret for webhook validation
GITHUB_TOKEN=ghp_xxxxx              # For triggering workflows
```

### Getting the Notion Token

1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your Posts database with the integration

### Getting the Database ID

1. Open your Posts database in Notion
2. Click "Share" → "Copy link"
3. The URL looks like: `https://www.notion.so/YOUR_WORKSPACE/DATABASE_ID?v=...`
4. Copy the DATABASE_ID part (32 characters, no dashes)

## Local Development

To test the sync locally:

```bash
# Set environment variables
export NOTION_TOKEN="secret_xxxxx"
export NOTION_DATABASE_ID="xxxxx"

# Run the sync
pnpm run sync-notion

# Or run the export (one-time, to populate Notion from existing posts)
pnpm run export-to-notion
```
