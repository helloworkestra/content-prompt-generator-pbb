# GHL Content Tracker

A tiny personal web app. You tap one button, it hands you the exact AI prompt to paste into your custom GPT for the next Facebook post. It remembers where you left off — across 30 days, 5 posts per day, 150 prompts total. When you run out, it lets you add more days.

Built with **Next.js 14 (App Router)** + **Supabase** + **Vercel**. Plain JavaScript, no TypeScript.

---

## What you're going to do (about 20 minutes, no coding needed)

1. Create a free Supabase project (the database).
2. Paste one SQL file into Supabase to set everything up.
3. Push this folder to a new GitHub repo.
4. Import it into Vercel and add two environment variables.
5. Open the live URL and start tapping "Get Next Prompt."

That's it. Follow the steps below in order.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and sign up (free).
2. Click **New Project**. Give it any name (e.g. `ghl-content-tracker`), pick a strong database password (save it somewhere), pick the region closest to you, and hit **Create new project**. Wait ~1 minute for it to finish setting up.
3. In the left sidebar, click **SQL Editor** → **New query**.
4. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the **entire contents**, paste into the SQL editor, and click **Run**. You should see "Success. No rows returned."
   - This creates two tables (`days` and `generated_log`), sets up permissions, and loads all 30 days of seed data.

### Grab your two Supabase keys

1. In the Supabase left sidebar, click the gear icon (**Project Settings**) → **API**.
2. You'll need two values from this page. Keep this tab open:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **Project API keys → anon / public** — a long string starting with `eyJ…`

---

## Step 2 — Put the code on GitHub

If you already have this folder on your computer:

1. Go to **https://github.com/new** and create a new repository. Call it whatever you want (e.g. `ghl-content-tracker`). Leave it **private** if you prefer. Do **not** add a README, .gitignore, or license from GitHub — this folder already has them.
2. GitHub will show you a page with commands. In a terminal, from inside this project folder, run these (one line at a time). Copy exactly:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Replace `YOUR-USERNAME/YOUR-REPO` with the URL GitHub gave you.

> If you don't have Git installed: install **GitHub Desktop** (https://desktop.github.com), then **File → Add local repository**, point it at this folder, and use the "Publish repository" button. Same result, no terminal.

---

## Step 3 — Deploy on Vercel

1. Go to **https://vercel.com** and sign in with GitHub (free).
2. Click **Add New… → Project**.
3. Find the repo you just pushed and click **Import**.
4. Before clicking Deploy, expand **Environment Variables** and add these two (get the values from the Supabase API page in Step 1):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL (`https://…supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon / public key (`eyJ…`) |

5. Click **Deploy**. Wait ~1 minute.
6. When it's done, click **Visit** to open your live app. Bookmark it on your phone.

That's the whole setup. You're done.

---

## Optional — Run it on your own computer first

If you want to try it locally before deploying:

1. Install **Node.js 18+** from https://nodejs.org.
2. In this folder, copy `.env.local.example` to a new file called `.env.local` and fill in your Supabase URL and anon key.
3. In a terminal:
   ```
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

---

## How to use it

There are three pages. Use the top navigation to switch between them.

### Home
- **Which date is Day 1?** — pick the real calendar date you want Day 1 to fall on and click Save. This ONLY controls how days line up on the Calendar page. It does NOT change what "Get Next Prompt" gives you next — that always advances one post at a time from where you left off. You can change the start date at any time. **Per-business setting** — each business tracks its own start date.
- **Get Next Prompt** — tap the big button. It figures out where you left off (Day X, Post Y of 5), fills the right template with that day's symptom + hook combo, and shows the full prompt.
- **Copy** — tap Copy, then paste into your custom GPT.
- **Recent prompts** — expand any entry in the history list to view or re-copy the last 10 prompts.
- **Bulk generate** — two extra buttons below the main flow, for when you want to batch instead of tapping "Next" 5 times:
  - **Generate all for one day** — pick a day (by number, or by date if you've set a start date) and it generates all 5 posts for that day at once, in order. Each is shown with its own Copy button and a tag showing whether it was *just generated* or *already generated*.
  - **Generate for a range** — pick a start and end day and it does the same for every day in the range, grouped by day so you can scroll and copy in order.
  - **Generate all remaining** — one click, catches you up on every prompt you haven't generated yet, all the way to the end of the topics currently in your Topics list. Starts exactly where "Get Next Prompt" would (the slot right after your most recent log row, or Day 1 · Post 1 if nothing is logged yet) and keeps going day by day until it hits a day number that has no topic. When it stops, it shows a note telling you which day it stopped after so you know where to add more topics.
  - **Already-logged posts are never overwritten or duplicated.** The bulk tools always skip any post that already has a row in `generated_log` and just re-show its stored prompt text. If a day in your range doesn't have a topic yet, the day is skipped with a small note pointing you to the Topics page.
- **Ran out of days?** — after all 30 days × 5 posts = 150 prompts, the app will ask you to enter one more day (Topic, Symptom, Hook Combo). It auto-continues the sequence rotation, saves the day, and gives you its first prompt.

### Calendar
- Monthly view. Each date that maps to a Day 1–30 (or later, if you added more) shows the day's symptom and a small "X/5 posted" badge. Grayed-out cells are dates outside your content plan and aren't clickable.
- Click any date to open a detail panel showing the day's topic, hook combo, and all 5 planned posts in order. For any post you've already generated, you can expand the prompt and enter Likes / Comments / Shares from Facebook, then click Save. A running total shows next to each post once you've entered numbers.

### Topics
- The full list of every day in your content plan (from the `days` table). Edit the topic, symptom, hook combo, week number, or the 5-post sequence order for any day.
- **✨ Add New Week (AI)** — one click. The app calls Groq (llama-3.3-70b-versatile) with your Audience Profile and the list of topics you've already used, and comes back with a fresh weekly theme + 7 daily symptoms. Everything is editable before you hit Save; hitting Save inserts 7 consecutive days that share the same topic and hook combo, one symptom each. If your Audience Profile is empty, the button tells you to set it up first.
- **Add New Topic** — one required field: **Topic**. Everything else auto-fills so you can save in two clicks:
  - **Day number** = (max existing day) + 1
  - **Week number** = ceil(day_number / 7)
  - **Symptom** = mirrors Topic (until you edit it in advanced options)
  - **Hook Combo** = rotates through a fixed list based on how many days already exist:
    1. Pain of invisibility + Trigger of realization
    2. Pain of wasted effort + Trigger of loss aversion
    3. Pain of uncertainty + Trigger of identity shift
    4. Pain of fear + Trigger of discomfort
    5. Pain of comparison + Trigger of contrast
    6. Pain of stagnation + Trigger of time sensitivity
  - **Sequence** = the same rotation the app already uses — `["Handraiser","Relatable","Personal Take","Disruptor","Authority"]` rotated by `(day_number - 1) % 5`
- Need more control? Click **Advanced options** to reveal editable Day / Week / Symptom / Hook Combo / Sequence fields, all pre-filled with the auto-computed values. Overriding any of them saves your custom value. The Edit form uses the same collapsed-by-default layout.
- **Day number can't be changed after creation.** It's the key that ties every generated prompt in your history back to the right day, so changing it would orphan those prompts. Delete + re-add if you truly need a different number.
- Deleting a day warns you if it already has generated prompts logged against it. The prompts stay in your history either way — they just show as unassigned going forward.

### Audience (Profile)
- **Per-business setting.** Each business in the switcher has its own separate Audience Profile — switching businesses in the topnav loads that business's own values (empty on first visit until you fill them in). Saving under one business never touches another.
- Three textareas describe *who* the reader is, *what* they want, and *what* they're struggling with.
- These three fields are the only input the AI **Generate New Week** button needs — after this page is filled in once, generating a new week takes one click. No prompts to write, no context to paste, no per-week input.
- Seeded on first install with a starting profile you can edit or replace.
- Requires `GROQ_API_KEY` in your server env (`.env.local` for local dev, Vercel project env vars for production) for the AI generation to work. The key is only used server-side inside the `/api/generate-week` route — it is never sent to the browser.

#### Guided Setup (quiz)
- If the profile has never been filled in, the page opens on **Guided Setup** — a 4-question quiz. If a profile already exists, it opens on **Write it myself** with the current values, and a "Redo guided setup" link is available either way.
- The 4 fixed questions are:
  1. Who is your ideal client? (industry, role, team size — be specific)
  2. What do they want more of in their business right now?
  3. What's frustrating them about how things currently run day to day?
  4. What have they already tried or paid for that didn't fully fix the problem?
- Hitting **Generate my profile** sends the 4 answers to `/api/generate-profile`, which asks Groq to distill them into the three profile fields (inferring the quieter emotional layer from what they've tried and what's still not working, rather than asking about it directly).
- The generated text always lands in the editable **Write it myself** view — nothing is saved until you click **Save**. If generation fails, your answers stay in the quiz so you can retry or fill in the fields manually.

### Branding
- **Per-business setting.** Each business has its own colors and fonts — switching businesses in the topnav loads that business's own branding.
- 7 color pickers (Main Brand, Text Main, CTA Buttons, Background, Secondary BG, Accent, Soft Accent) and 4 font dropdowns (Heading, Body, Subheading, Accent). Font dropdowns accept typing a custom Google Font name if the one you want isn't in the suggestion list.
- **Live preview** below the form updates as you type — no need to Save to see the change. Google Fonts are loaded on the fly for whichever fonts are currently selected.
- **Light styling on the Home page.** The saved brand color + heading font are applied to the Home page heading, and the CTA color + accent font are applied to the "Copy" button on the current-prompt card. Text stays readable — the button text auto-flips to black or white depending on brightness of your chosen background. Everything falls back to sensible defaults if a business hasn't set up branding yet.

### Portraits
- **Per-business prompt library** for generating on-brand headshots from a reference photo. One shared **Base Template** with a `{VARIATION}` slot plus color placeholders (`{MAIN_COLOR}`, `{TEXT_COLOR}`, `{BG_COLOR}`, `{SECONDARY_BG_COLOR}`, `{ACCENT_COLOR}`, `{SOFT_ACCENT_COLOR}`) that resolve at copy-time from that business's saved Branding colors.
- **Variations list** below the template — each entry is one pose/wardrobe/angle description. Add as many as you want, edit inline, reorder with up/down arrows, delete individually.
- Every row has a **Copy Full Prompt** button that stitches the template + this variation + the current Branding colors into one clipboard-ready prompt, plus a **Show Full Prompt** toggle to preview it first.
- If Branding hasn't been set up yet for this business, a small warning links to the Branding page and the color placeholders stay literal in the preview instead of breaking.

### Visuals
- **Per-business master graphic prompt** for generating a branded 1:1 social media graphic from a supplied headline + photo + approved logo.
- One long, detailed template with strict rules around colors, fonts, layout, decorative asset limits, and icon usage. Placeholders resolve at copy-time from Branding.
- Placeholder set: `{OWNER_NAME}`, `{OWNER_TITLE}`, `{MAIN_COLOR_NAME}`/`{MAIN_COLOR_HEX}` (and matching pairs for Text, BG, Secondary BG, Accent, Soft Accent), plus `{HEADING_FONT}`, `{BODY_FONT}`, `{SUBHEADING_FONT}`, `{ACCENT_FONT}`.
- **`{OWNER_NAME}` comes from the business's own name** (the same value shown in the top-nav business switcher) — no separate input needed. `{OWNER_TITLE}` still comes from the editable "Owner Title" field on the Branding page.
- Rendered prompt is shown read-only with a **Copy Prompt** button; an **Edit template** toggle exposes the raw template with placeholders intact and a Save button for structural changes.
- If Branding hasn't been set up yet for this business, a small warning links to the Branding page.

### Links
- **Per-business list of shortcuts.** Add any number of labeled URLs — custom ChatGPTs, content calendar docs, dashboards, drives, anything you want quick access to while working.
- Add / edit / delete / reorder on the **Links** page in the topnav. Basic http(s) validation on save.
- Every saved link renders as an **Open [Title] ↗** button next to the Copy buttons on the Home page's current-prompt card and on the Portraits page (Master Prompt + every variation row). All open in a new tab.
- Empty list = no buttons — no dead UI.

### Dashboard
- Ranks your posts by average engagement (likes + comments + shares per post) in three tables: by content type, by weekly topic, and by hook combo.
- Only counts posts where you've entered any engagement numbers. Enter numbers on the Calendar page first.

You never have to touch the database. Everything happens in the app.

---

## If you already ran the earlier version of the schema

If you set up the database before the calendar/dashboard features were added and want to keep your generated_log history, don't re-run the full [`supabase/schema.sql`](supabase/schema.sql) file (that drops the tables). Instead, open it, scroll to the bottom section labelled **"SAFE UPGRADES FOR EXISTING INSTALLS"**, uncomment those lines, and paste just that block into the Supabase SQL editor. That adds the new columns and the settings table without touching your data.

---

## Files, if you're curious

- [`app/page.js`](app/page.js) — the single main page
- [`lib/templates.js`](lib/templates.js) — the 5 prompt templates + sequence rotation math
- [`lib/supabaseClient.js`](lib/supabaseClient.js) — the Supabase connection
- [`supabase/schema.sql`](supabase/schema.sql) — one-shot database setup + 30 days of seed data
