-- =====================================================================
-- GHL Content Tracker — Supabase schema + seed data (multi-business)
--
-- FRESH SETUP: paste this whole file into the Supabase SQL Editor and
-- click Run. Safe to re-run — it drops and recreates all content tables
-- (you'll lose your generated_log history if you re-run).
--
-- ALREADY HAVE DATA? Skip the fresh-setup block below and jump to the
-- "MIGRATION FOR EXISTING INSTALLS" block at the bottom. It's
-- idempotent — wraps everything under a "My Business" business without
-- dropping anything.
-- =====================================================================

drop table if exists generated_log;
drop table if exists days;
drop table if exists settings;
drop table if exists audience_profile;
drop table if exists visual_prompt_template;
drop table if exists branding_profile;
drop table if exists portrait_variations;
drop table if exists portrait_base_template;
drop table if exists business_links;
drop table if exists businesses;

create table businesses (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table days (
  business_id  bigint not null references businesses(id) on delete cascade,
  day_number   int not null,
  week_number  int not null,
  topic        text not null,
  symptom      text not null,
  hook_combo   text not null,
  sequence     text[] not null,
  primary key (business_id, day_number)
);

create table generated_log (
  id           bigint generated always as identity primary key,
  business_id  bigint not null references businesses(id) on delete cascade,
  day_number   int not null,
  post_index   int not null check (post_index between 1 and 5),
  content_type text not null,
  prompt_text  text not null,
  likes        int not null default 0,
  comments     int not null default 0,
  shares       int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index generated_log_biz_created_idx on generated_log (business_id, created_at desc);
create index generated_log_biz_day_post_idx on generated_log (business_id, day_number, post_index);

-- One settings row per business.
create table settings (
  business_id       bigint primary key references businesses(id) on delete cascade,
  start_date        date
);

-- Free-form per-business links (ChatGPTs, docs, dashboards, anything).
-- Surface everywhere the app has a Copy button so you can jump straight to
-- where you're about to paste.
create table business_links (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  position    int not null,
  title       text not null,
  url         text not null
);
create index business_links_biz_pos_idx on business_links (business_id, position);

-- One audience profile per business. Used by the AI "Generate New Week" feature
-- to describe the reader so themes stay on-tone. Each business has its own.
create table audience_profile (
  business_id     bigint primary key references businesses(id) on delete cascade,
  who_they_are    text not null default '',
  their_goal      text not null default '',
  their_struggles text not null default ''
);

-- Branded portrait prompt library — one base template per business + many
-- variation entries. Colors in the template are placeholders resolved at
-- copy-time from branding_profile.
create table portrait_base_template (
  business_id   bigint primary key references businesses(id) on delete cascade,
  template_text text not null default ''
);

create table portrait_variations (
  id             bigint generated always as identity primary key,
  business_id    bigint not null references businesses(id) on delete cascade,
  position       int not null,
  variation_text text not null
);
create index portrait_variations_biz_pos_idx on portrait_variations (business_id, position);

-- One branding profile per business. Powers the Branding page + light
-- styling on the Home page (heading + Copy button).
create table branding_profile (
  business_id             bigint primary key references businesses(id) on delete cascade,
  main_brand_color        text not null default '#2563eb',
  main_brand_color_name   text not null default '',
  text_main_color         text not null default '#111111',
  text_main_color_name    text not null default '',
  cta_button_color        text not null default '#111111',
  background_color        text not null default '#ffffff',
  background_color_name   text not null default '',
  secondary_bg_color      text not null default '#f7f7f8',
  secondary_bg_color_name text not null default '',
  accent_color            text not null default '#e11d48',
  accent_color_name       text not null default '',
  soft_accent_color       text not null default '#fde68a',
  soft_accent_color_name  text not null default '',
  heading_font            text not null default 'Inter',
  body_font               text not null default 'Inter',
  subheading_font         text not null default 'Inter',
  accent_font             text not null default 'Inter',
  owner_name              text not null default '',
  owner_title             text not null default ''
);

-- One visual (graphic) master prompt per business. Placeholders are resolved
-- at copy-time from branding_profile.
create table visual_prompt_template (
  business_id   bigint primary key references businesses(id) on delete cascade,
  template_text text not null default ''
);

-- Seed a starter profile for the initial "My Business" so the app isn't empty.
with b as (select id from businesses where name = 'My Business')
insert into audience_profile (business_id, who_they_are, their_goal, their_struggles)
select
  id,
  'US-based tax prep and financial services firm owners, usually running a small team (them plus 2-5 admin or preparer staff), already using GoHighLevel or some CRM but never fully set up right, doing six figures but still buried in manual work every tax season.',
  'They want to stop being the bottleneck in their own business. They want leads to follow up on themselves, appointments to fill without them chasing, and tax season to not feel like a hostage situation every single year.',
  'They feel behind, even though the business is technically doing fine. They feel embarrassed that they paid for a whole CRM system and still do half of it manually. They feel resentful of their own growth, because more clients just means more chaos, not more freedom.'
from b
on conflict (business_id) do nothing;

-- --------------------------------------------------------------------
-- Row Level Security — single-user personal tool, allow anon full access.
-- --------------------------------------------------------------------
alter table businesses             enable row level security;
alter table days                   enable row level security;
alter table generated_log          enable row level security;
alter table settings               enable row level security;
alter table audience_profile       enable row level security;
alter table branding_profile       enable row level security;
alter table portrait_base_template enable row level security;
alter table portrait_variations    enable row level security;
alter table visual_prompt_template enable row level security;
alter table business_links         enable row level security;

drop policy if exists "biz anon all"           on businesses;
drop policy if exists "days anon all"          on days;
drop policy if exists "log anon all"           on generated_log;
drop policy if exists "settings anon all"      on settings;
drop policy if exists "audience anon all"      on audience_profile;
drop policy if exists "branding anon all"      on branding_profile;
drop policy if exists "portrait base anon all" on portrait_base_template;
drop policy if exists "portrait var anon all"  on portrait_variations;
drop policy if exists "visual tpl anon all"    on visual_prompt_template;
drop policy if exists "biz links anon all"     on business_links;

create policy "biz anon all"           on businesses             for all to anon using (true) with check (true);
create policy "days anon all"          on days                   for all to anon using (true) with check (true);
create policy "log anon all"           on generated_log          for all to anon using (true) with check (true);
create policy "settings anon all"      on settings               for all to anon using (true) with check (true);
create policy "audience anon all"      on audience_profile       for all to anon using (true) with check (true);
create policy "branding anon all"      on branding_profile       for all to anon using (true) with check (true);
create policy "portrait base anon all" on portrait_base_template for all to anon using (true) with check (true);
create policy "portrait var anon all"  on portrait_variations    for all to anon using (true) with check (true);
create policy "visual tpl anon all"    on visual_prompt_template for all to anon using (true) with check (true);
create policy "biz links anon all"     on business_links         for all to anon using (true) with check (true);

-- --------------------------------------------------------------------
-- Seed: a "My Business" business + the original 30 days
-- (Rename it any time from the switcher in the app's top nav.)
-- --------------------------------------------------------------------
insert into businesses (name) values ('My Business');

with b as (select id from businesses where name = 'My Business')
insert into days (business_id, day_number, week_number, topic, symptom, hook_combo, sequence)
select b.id, v.* from b, (values
-- Week 1
(1,  1, 'The CRM that isn''t actually automating anything', 'Manual reminders despite paid CRM',            'Pain of invisibility + Trigger of realization', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
(2,  1, 'The CRM that isn''t actually automating anything', 'Manual data re-entry from forms',              'Pain of invisibility + Trigger of realization', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
(3,  1, 'The CRM that isn''t actually automating anything', 'Not knowing what''s automatic vs manual',      'Pain of invisibility + Trigger of realization', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(4,  1, 'The CRM that isn''t actually automating anything', 'Underused paid tools',                         'Pain of invisibility + Trigger of realization', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
(5,  1, 'The CRM that isn''t actually automating anything', 'Disconnected intake form and CRM',             'Pain of invisibility + Trigger of realization', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']),
(6,  1, 'The CRM that isn''t actually automating anything', 'Silently broken workflows',                    'Pain of invisibility + Trigger of realization', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
(7,  1, 'The CRM that isn''t actually automating anything', 'Staff noticing the gaps',                      'Pain of invisibility + Trigger of realization', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
-- Week 2
(8,  2, 'The stuff quietly falling through the cracks', 'Dead leads avoided',                     'Pain of wasted effort + Trigger of loss aversion', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(9,  2, 'The stuff quietly falling through the cracks', 'Referral system leaks',                  'Pain of wasted effort + Trigger of loss aversion', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
(10, 2, 'The stuff quietly falling through the cracks', 'Leads gone cold unnoticed',              'Pain of wasted effort + Trigger of loss aversion', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']),
(11, 2, 'The stuff quietly falling through the cracks', 'Forgotten follow-up promises',           'Pain of wasted effort + Trigger of loss aversion', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
(12, 2, 'The stuff quietly falling through the cracks', 'Missed referral partner momentum',       'Pain of wasted effort + Trigger of loss aversion', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
(13, 2, 'The stuff quietly falling through the cracks', 'Unsent proposals or contracts',          'Pain of wasted effort + Trigger of loss aversion', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(14, 2, 'The stuff quietly falling through the cracks', 'Avoided inbox and missed calls',         'Pain of wasted effort + Trigger of loss aversion', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
-- Week 3
(15, 3, 'Living in your head instead of in the system', '"After tax season" excuse, repeated yearly', 'Pain of uncertainty + Trigger of identity shift', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']),
(16, 3, 'Living in your head instead of in the system', 'Broken setup left by a past hire',           'Pain of uncertainty + Trigger of identity shift', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
(17, 3, 'Living in your head instead of in the system', 'Re-explaining onboarding out loud',          'Pain of uncertainty + Trigger of identity shift', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
(18, 3, 'Living in your head instead of in the system', 'Tribal knowledge risk',                      'Pain of uncertainty + Trigger of identity shift', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(19, 3, 'Living in your head instead of in the system', 'Unfixed mental to-do list',                  'Pain of uncertainty + Trigger of identity shift', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
(20, 3, 'Living in your head instead of in the system', 'Wanting to switch platforms instead of fixing', 'Pain of uncertainty + Trigger of identity shift', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']),
(21, 3, 'Living in your head instead of in the system', 'Undocumented process for new hires',         'Pain of uncertainty + Trigger of identity shift', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
-- Week 4
(22, 4, 'What this is actually costing you emotionally', 'Dashboard dread',                          'Pain of fear + Trigger of discomfort', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
(23, 4, 'What this is actually costing you emotionally', 'Tax season triage mode',                   'Pain of fear + Trigger of discomfort', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(24, 4, 'What this is actually costing you emotionally', 'Document status scramble',                 'Pain of fear + Trigger of discomfort', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
(25, 4, 'What this is actually costing you emotionally', 'Embarrassment when asked what''s automated', 'Pain of fear + Trigger of discomfort', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']),
(26, 4, 'What this is actually costing you emotionally', 'Growth without freedom',                   'Pain of fear + Trigger of discomfort', array['Handraiser','Relatable','Personal Take','Disruptor','Authority']),
(27, 4, 'What this is actually costing you emotionally', 'Saying "I need to get organized"',         'Pain of fear + Trigger of discomfort', array['Relatable','Personal Take','Disruptor','Authority','Handraiser']),
(28, 4, 'What this is actually costing you emotionally', 'Guilt about overdue clients',              'Pain of fear + Trigger of discomfort', array['Personal Take','Disruptor','Authority','Handraiser','Relatable']),
(29, 4, 'What this is actually costing you emotionally', 'Pre-season anxiety',                       'Pain of fear + Trigger of discomfort', array['Disruptor','Authority','Handraiser','Relatable','Personal Take']),
(30, 4, 'What this is actually costing you emotionally', 'Low hum of dread before busy periods',     'Pain of fear + Trigger of discomfort', array['Authority','Handraiser','Relatable','Personal Take','Disruptor'])
) as v(day_number, week_number, topic, symptom, hook_combo, sequence);

with b as (select id from businesses where name = 'My Business')
insert into settings (business_id, start_date) select id, null from b
on conflict (business_id) do nothing;

-- Seed a starter branding profile for the initial business (colors match the
-- names used in the seeded portrait template so the Master Prompt renders
-- correctly out of the box).
with b as (select id from businesses where name = 'My Business')
insert into branding_profile (
  business_id,
  main_brand_color,   main_brand_color_name,
  text_main_color,    text_main_color_name,
  cta_button_color,
  background_color,   background_color_name,
  secondary_bg_color, secondary_bg_color_name,
  accent_color,       accent_color_name,
  soft_accent_color,  soft_accent_color_name,
  heading_font, body_font, subheading_font, accent_font,
  owner_name, owner_title
) select
  id,
  '#356B52', 'Deep Sage',
  '#26332D', 'Green-Charcoal',
  '#26332D',
  '#FAF9F5', 'Warm Ivory',
  '#DDE9DF', 'Soft Sage',
  '#D96B32', 'Terracotta',
  '#879B78', 'Muted Sage',
  'Inter', 'Inter', 'Inter', 'Inter',
  'Giem Muel Catubay', 'GHL Specialist for Tax Firms'
from b
on conflict (business_id) do nothing;

-- Seed the portrait base template + starter variations for the initial business.
-- {MAIN_COLOR} etc. resolve to "Name `#HEX`". {MAIN_HEX} etc. resolve to just "`#HEX`".
with b as (select id from businesses where name = 'My Business')
insert into portrait_base_template (business_id, template_text)
select id, 'Using the uploaded photo as the exact likeness reference, generate a professional portrait of this same person, keeping facial features, skin tone, and identity fully consistent and unaltered. {VARIATION}. Studio-quality lighting, soft and natural, no harsh shadows. Background: solid clean color in {TEXT_COLOR} or {BG_COLOR} (pick one, no gradients, no textures, no patterns). Wardrobe color: solid-color shirt in {MAIN_COLOR} or {TEXT_COLOR} as the base, optionally with a small {ACCENT_COLOR} accent (like a subtle collar detail or accessory) — do not introduce any colors outside this exact palette: {MAIN_HEX}, {TEXT_HEX}, {BG_HEX}, {SECONDARY_BG_HEX}, {ACCENT_HEX}, {SOFT_ACCENT_HEX}. Realistic photography style, sharp focus, high resolution, no illustration or cartoon effect, no text or logos in the image.'
from b
on conflict (business_id) do nothing;

with b as (select id from businesses where name = 'My Business')
insert into portrait_variations (business_id, position, variation_text)
select b.id, v.pos, v.txt from b cross join (values
  (1, 'Straight-on angle, confident posture, slight smile, hands loosely clasped in front'),
  (2, 'Side profile turned toward camera, one hand resting on chin thoughtfully'),
  (3, 'Sitting on a stool, leaning slightly forward, elbows on knees, approachable expression'),
  (4, 'Standing with arms crossed, confident and approachable, slight head tilt'),
  (5, 'Same pose as reference, but wearing a solid Warm Ivory button-up shirt with sleeves rolled up'),
  (6, 'Slight low-angle shot looking up at subject, standing tall, shoulders back, calm expression'),
  (7, 'Over-the-shoulder angle, head turned back toward camera, relaxed half-smile')
) as v(pos, txt);

-- Seed the visual (graphic) master prompt template for the initial business.
-- {OWNER_NAME} is resolved at render-time from the business's own `name`
-- column (not from branding_profile). {OWNER_TITLE} is resolved from
-- branding_profile.owner_title. All other placeholders come from
-- branding_profile as well.
with b as (select id from businesses where name = 'My Business')
insert into visual_prompt_template (business_id, template_text)
select id, $VISTPL$You are a graphic generator for {OWNER_NAME} ({OWNER_TITLE}).

Your job is to create one clean, premium, branded square social media graphic based ONLY on the headline text the user provides in a separate message.

1. WAIT FOR THE HEADLINE

Do NOT generate an image immediately after receiving these instructions.

These instructions are configuration only.

Wait until the user sends a separate message containing the actual headline text for a specific post.

When the user sends the headline, treat it as a NEW graphic request and generate exactly one graphic.

Do not ask unnecessary questions.

Only ask the user for something if:

the required photo file has not been provided, or

the headline is too long to fit cleanly.

Otherwise, generate the graphic directly.

2. ABSOLUTE CONTENT RULE

The graphic may contain ONLY these content types:

The exact headline text supplied by the user.

The user's supplied photo.

One of the three approved {OWNER_NAME} logo files.

0–3 approved decorative assets maximum.

Nothing else.

NEVER ADD:

Extra headlines, Taglines, Subtitles, Body copy, Explanatory text, Quotes, Captions, Calls to action, Emojis, Hashtags, Stock illustrations, Stock icons, Generated illustrations, Random symbols, Decorative text, Additional words not supplied by the user

Do not invent or rewrite the headline.

3. BRAND COLORS — STRICT

Use ONLY these exact colors:

{MAIN_COLOR_NAME}: {MAIN_COLOR_HEX} — main brand color and CTA/accent elements

{TEXT_COLOR_NAME}: {TEXT_COLOR_HEX} — primary dark background and dark text

{BG_COLOR_NAME}: {BG_COLOR_HEX} — light background and light text

{SECONDARY_BG_COLOR_NAME}: {SECONDARY_BG_COLOR_HEX} — secondary background

{ACCENT_COLOR_NAME}: {ACCENT_COLOR_HEX} — accent only, used sparingly

{SOFT_ACCENT_COLOR_NAME}: {SOFT_ACCENT_COLOR_HEX} — soft accent only, used sparingly

COLOR RULES

Do not introduce any other colors. Do not use gradients containing colors outside this palette. Do not use neon colors. Do not use blue, purple, red, orange, yellow, pink, or other unapproved colors. Photo colors may remain natural unless a color overlay is required for readability. Decorative elements must use only the approved brand colors.

4. TYPOGRAPHY — STRICT

Use ONLY these fonts:

Headline: {HEADING_FONT} Bold

Body/Subheading: {BODY_FONT}

Labels/Accents: {ACCENT_FONT}, uppercase, with generous letter spacing.

Do not use any other typeface. The headline must remain the primary visual focus.

5. FORMAT

Create exactly: 1:1 square format. Suitable for Instagram and Facebook. The final composition should feel: Clean, Premium, Modern, Professional, Minimal, Confident, Branded, Spacious. Avoid clutter.

6. LAYOUT STRUCTURE

Use the following structure as the design system. Do NOT treat every instruction below as something that must appear simultaneously. Optional elements should be omitted when they make the design cleaner.

BACKGROUND

Use either: {TEXT_COLOR_NAME} {TEXT_COLOR_HEX} / {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} / {BG_COLOR_NAME} {BG_COLOR_HEX} / {SECONDARY_BG_COLOR_NAME} {SECONDARY_BG_COLOR_HEX}

Preferred default: {TEXT_COLOR_NAME} {TEXT_COLOR_HEX}

A background shape may be used, but it is optional.

Background shape limit: Use ZERO or ONE background shape maximum. If used, it must be: A single soft rounded organic blob, Simple, Large, Subtle, Positioned near an edge or corner. Do NOT create multiple blobs. Do NOT create clusters of circles. Do NOT create overlapping decorative shapes. Do NOT create waves, particles, dots, geometric backgrounds, or abstract texture.

7. PHOTO

The user's supplied photo is a primary composition element. Use the supplied photo naturally within the design.

Possible placements: Left side, Right side, Top/bottom section, Full-bleed background

The photo may be: Cropped, Resized, Masked, Softly blended, Integrated into the background, Given an approved-color overlay when necessary for readability

Do not turn the photo into a hard, generic rectangle unless absolutely necessary. Randomize photo placement between different graphics so the compositions do not feel repetitive.

IMPORTANT: The photo is NOT a decorative asset and does not count toward the 3 decorative asset limit.

8. HEADLINE

The user-provided headline is the main focal point.

Use: {HEADING_FONT} Bold, Large type, Strong hierarchy, High contrast, 2–4 short visual lines where possible

Do not rewrite, paraphrase, shorten, expand, or add words to the headline. You may adjust: Line breaks, Alignment, Font size, Width, Position, Spacing — to make the supplied headline fit cleanly.

ALIGNMENT: Randomize between Left aligned, Right aligned, Center aligned. Do not use the same alignment repeatedly when another option works better.

POSITION: Randomize between Top-heavy, Centered, Bottom-heavy — while maintaining strong visual balance.

HEADLINE COLORS: Most headline text should use {BG_COLOR_NAME} {BG_COLOR_HEX} on dark backgrounds, {TEXT_COLOR_NAME} {TEXT_COLOR_HEX} on light backgrounds

You may emphasize 1–2 important words using {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} OR {ACCENT_COLOR_NAME} {ACCENT_COLOR_HEX}. Do not use both accent colors on the same word. Do not over-color the headline.

9. ACCENT RULE

A single thin horizontal accent rule may be placed immediately above or below the headline. It may use {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} OR {ACCENT_COLOR_NAME} {ACCENT_COLOR_HEX}. The accent rule is part of the typography/text lockup. Do not create additional decorative lines. Do not create multiple lines. Do not create geometric line patterns.

10. LOGO — MANDATORY

The logo lockup is REQUIRED on every graphic. Use exactly ONE of the three approved {OWNER_NAME} logo files: Circular badge, Horizontal logo, Horizontal extended logo

Choose whichever approved logo best fits the composition. Position it: In a bottom corner, OR Bottom-center

The logo must: Remain fully visible, Remain legible, Maintain correct proportions, Never be distorted, Never be cropped, Never be replaced, Never be redrawn, Never be recreated

The logo is NOT a decorative asset and does not count toward the 3 decorative asset limit.

11. DECORATIVE ASSET LIMIT — ABSOLUTE

This is a HARD LIMIT. The graphic may contain: 0–3 decorative assets TOTAL. Never exceed 3. A decorative asset means one separately placed visual decoration.

Examples: One background blob = 1 decorative asset. One approved icon = 1 decorative asset. One approved decorative motif = 1 decorative asset.

HARD CEILING: Maximum 1 background shape, 1 approved icon, 1 decorative motif. Therefore: 1 + 1 + 1 = 3 maximum decorative assets. Using fewer is encouraged.

PREFERRED DEFAULT: The safest and preferred composition is 1 background shape + 0 icons + 0 motifs, or 0 background shapes + 1 icon + 0 motifs.

Do NOT add decorations simply to fill empty space. If the composition already looks balanced, use fewer decorative assets.

12. DO NOT GENERATE DECORATIVE SHAPES

This rule is extremely important. Do NOT create: Extra circles, Extra dots, Particles, Sparkles, Stars, Waves, Lines, Geometric clusters, Random polygons, Abstract fragments, Texture, Noise, Confetti, Decorative grids, Decorative rings, Decorative strokes, Background patterns, Floating shapes, Additional blobs, Additional geometric objects

Do not compensate for empty space by adding decorations. Empty space is intentional. A clean composition with fewer elements is preferable to a busy composition.

13. APPROVED ICONS

If an icon is used, it MUST be one of the exact supplied icon image files.

Approved icon assets: Node/network cluster, Empty rounded rectangle, Growth chart with hand, Speech bubble pair, Circle-dot grid, Rocket, Stacked cubes, Hexagon/woven pattern, Blank card shapes, Microchip/circuit board, Curved arrow, Node-tree diagram, Connected-dots constellation, Radial node cluster, Smartphone with signal lines, Looping arrow

ICON RULES: Use NO MORE THAN ONE approved icon per graphic. The icon must be placed as one single asset. Do not: Redraw it, Reinterpret it, Recreate it, Generate a similar icon, Combine multiple icons, Duplicate the icon, Add shapes around the icon, Add decorative dots around the icon, Extend the icon with new graphics, Create a new illustration based on the icon

Use the exact supplied icon file. You may: Resize it proportionally, Flip it, Recolor it using an approved brand color when appropriate

The internal lines, dots, nodes, circles, and components that are already part of the supplied icon are considered part of that single icon asset. Do NOT duplicate or extend those internal components.

14. NO PATTERNS OR TEXTURES

Do not generate standalone patterns or textures. Do not create: Dot patterns, Grid patterns, Repeating circles, Repeating geometric shapes, Noise textures, Halftones, Decorative waves, Particle fields, Meshes, Abstract backgrounds, Repeating line patterns

If an approved icon file itself contains a pattern, use the exact supplied file as-is. Do not create additional patterns around it.

15. DECORATIVE ASSET DECISION PROCESS

Before finalizing the graphic, follow this priority:

Step 1: Create the composition using Headline, Photo, Logo

Step 2: Determine whether the composition already looks complete. If YES: Add nothing.

Step 3: If additional visual balance is needed, add ONE approved decorative asset.

Step 4: Only add a second or third decorative asset if it materially improves the composition.

Step 5: Never exceed 3 total decorative assets.

SAFETY RULE: If you are uncertain whether an element counts as a decorative asset: Do not add it. When choosing between more decoration and more whitespace: Choose whitespace.

16. VISUAL VARIATION

Every new graphic should feel visually distinct from the previous graphic. Achieve variation by changing: Photo position, Headline alignment, Headline position, Crop, Logo position, Background color, Accent color, Size/position of the ONE optional background shape, Whether an approved icon is used

Do NOT create visual variation by adding more decorative elements.

IMPORTANT: Variation means rearranging existing permitted elements, not introducing new elements.

17. CLEAN COMPOSITION RULE

The design should feel intentionally minimal. Prioritize: Headline → Photo → Logo → Whitespace

Decorative assets are secondary. Do not allow decorations to compete with the headline. Do not overcrowd corners. Do not fill every empty area. Do not make the design look like a template packed with graphic elements.

18. FINAL COMPLIANCE CHECK

Before rendering the final graphic, silently verify every requirement below.

CONTENT: Only the supplied headline is used. No extra text exists. User photo is used. Exactly one approved logo is used.

COLORS: Only the six approved brand colors are used for graphic elements. No unapproved decorative colors exist.

TYPOGRAPHY: Headline uses {HEADING_FONT} Bold. No other headline font is used. No invented text exists.

DECORATIVE ASSETS: 0–3 decorative assets total. No more than 1 background shape. No more than 1 approved icon. No more than 1 decorative motif. No extra dots. No extra circles. No particles. No sparkles. No generated patterns. No textures. No decorative geometry. No additional shapes surrounding icons. No duplicate decorative assets.

ICONS: If an icon is used, it is one of the exact supplied approved icon files. No icon has been redrawn or reinterpreted. No additional icons exist.

LOGO: Exactly one approved logo is present. Logo is fully visible. Logo is not distorted. Logo is not cropped.

COMPOSITION: 1:1 square format. Headline is the primary focal point. Photo is naturally integrated. Composition has sufficient whitespace. Design is clean and uncluttered.

FINAL RULE: If ANY decorative element causes the composition to exceed the 3-asset maximum: REMOVE IT. Do not substitute it with another decoration. Do not hide it. Do not merge it with another element. Do not reinterpret the counting rule. The final graphic must contain NO MORE THAN 3 DECORATIVE ASSETS. When in doubt, use fewer.

19. OUTPUT BEHAVIOR

When the user sends a headline: Treat it as a new graphic request. Use the supplied headline exactly. Use the supplied photo. Use exactly one approved logo. Create a clean 1:1 social graphic. Use 0–3 decorative assets maximum. Do not ask unnecessary questions. Generate the graphic directly.

Do NOT generate anything from this configuration message itself. Wait for the separate headline message.$VISTPL$
from b
on conflict (business_id) do nothing;


-- =====================================================================
-- MIGRATION FOR EXISTING INSTALLS
-- Only run this block if you already had the OLD (single-business)
-- schema and want to keep your existing data. Skip the fresh-setup
-- block above. This wraps everything under a "My Business" business.
-- Idempotent — safe to run more than once.
-- =====================================================================
--
-- create table if not exists businesses (
--   id         bigint generated always as identity primary key,
--   name       text not null unique,
--   created_at timestamptz not null default now()
-- );
-- alter table businesses enable row level security;
-- drop policy if exists "biz anon all" on businesses;
-- create policy "biz anon all" on businesses for all to anon using (true) with check (true);
-- insert into businesses (name) values ('My Business') on conflict (name) do nothing;
--
-- -- add business_id to days
-- alter table days add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update days set business_id = (select id from businesses where name='My Business') where business_id is null;
-- alter table days alter column business_id set not null;
-- -- swap PK to (business_id, day_number)
-- alter table days drop constraint if exists days_pkey;
-- alter table days add primary key (business_id, day_number);
--
-- -- add business_id to generated_log
-- alter table generated_log add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update generated_log set business_id = (select id from businesses where name='My Business') where business_id is null;
-- alter table generated_log alter column business_id set not null;
-- create index if not exists generated_log_biz_created_idx on generated_log (business_id, created_at desc);
-- create index if not exists generated_log_biz_day_post_idx on generated_log (business_id, day_number, post_index);
--
-- -- migrate settings: switch from single-row (id=1) to per-business
-- alter table settings add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update settings set business_id = (select id from businesses where name='My Business') where business_id is null;
-- alter table settings drop constraint if exists settings_pkey;
-- alter table settings drop constraint if exists settings_id_check;
-- alter table settings drop column if exists id;
-- alter table settings add primary key (business_id);
--
-- -- audience_profile (per-business) for the AI Generate New Week feature.
-- -- If you already have the OLD single-row version (id=1), this block also
-- -- migrates it: adds business_id, backfills the existing row to the first
-- -- business, drops the id column, and switches the PK.
-- create table if not exists audience_profile (
--   business_id     bigint primary key references businesses(id) on delete cascade,
--   who_they_are    text not null default '',
--   their_goal      text not null default '',
--   their_struggles text not null default ''
-- );
--
-- -- Migrate from single-row (id=1) if applicable. Safe to run on a fresh table too.
-- alter table audience_profile add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update audience_profile
--   set business_id = (select id from businesses order by id limit 1)
--   where business_id is null;
-- alter table audience_profile drop constraint if exists audience_profile_pkey;
-- alter table audience_profile drop constraint if exists audience_profile_id_check;
-- alter table audience_profile drop column if exists id;
-- do $$ begin
--   if not exists (
--     select 1 from pg_constraint where conname = 'audience_profile_pkey'
--   ) then
--     alter table audience_profile add primary key (business_id);
--   end if;
-- end $$;
--
-- alter table audience_profile enable row level security;
-- drop policy if exists "audience anon all" on audience_profile;
-- create policy "audience anon all" on audience_profile for all to anon using (true) with check (true);
--
-- -- Seed a starter profile for the first business only if none exists yet.
-- with b as (select id from businesses order by id limit 1)
-- insert into audience_profile (business_id, who_they_are, their_goal, their_struggles)
-- select
--   id,
--   'US-based tax prep and financial services firm owners, usually running a small team (them plus 2-5 admin or preparer staff), already using GoHighLevel or some CRM but never fully set up right, doing six figures but still buried in manual work every tax season.',
--   'They want to stop being the bottleneck in their own business. They want leads to follow up on themselves, appointments to fill without them chasing, and tax season to not feel like a hostage situation every single year.',
--   'They feel behind, even though the business is technically doing fine. They feel embarrassed that they paid for a whole CRM system and still do half of it manually. They feel resentful of their own growth, because more clients just means more chaos, not more freedom.'
-- from b
-- on conflict (business_id) do nothing;
--
-- -- branding_profile (per-business) — colors and fonts for the Branding page.
-- create table if not exists branding_profile (
--   business_id        bigint primary key references businesses(id) on delete cascade,
--   main_brand_color   text not null default '#2563eb',
--   text_main_color    text not null default '#111111',
--   cta_button_color   text not null default '#111111',
--   background_color   text not null default '#ffffff',
--   secondary_bg_color text not null default '#f7f7f8',
--   accent_color       text not null default '#e11d48',
--   soft_accent_color  text not null default '#fde68a',
--   heading_font       text not null default 'Inter',
--   body_font          text not null default 'Inter',
--   subheading_font    text not null default 'Inter',
--   accent_font        text not null default 'Inter'
-- );
-- alter table branding_profile enable row level security;
-- drop policy if exists "branding anon all" on branding_profile;
-- create policy "branding anon all" on branding_profile for all to anon using (true) with check (true);
--
-- -- portrait tables (per-business) — branded portrait prompt library.
-- create table if not exists portrait_base_template (
--   business_id   bigint primary key references businesses(id) on delete cascade,
--   template_text text not null default ''
-- );
-- create table if not exists portrait_variations (
--   id             bigint generated always as identity primary key,
--   business_id    bigint not null references businesses(id) on delete cascade,
--   position       int not null,
--   variation_text text not null
-- );
-- create index if not exists portrait_variations_biz_pos_idx on portrait_variations (business_id, position);
-- alter table portrait_base_template enable row level security;
-- alter table portrait_variations    enable row level security;
-- drop policy if exists "portrait base anon all" on portrait_base_template;
-- drop policy if exists "portrait var anon all"  on portrait_variations;
-- create policy "portrait base anon all" on portrait_base_template for all to anon using (true) with check (true);
-- create policy "portrait var anon all"  on portrait_variations    for all to anon using (true) with check (true);
--
-- -- Seed template + 7 starter variations for the first business (only if not already seeded).
-- with b as (select id from businesses order by id limit 1)
-- insert into portrait_base_template (business_id, template_text)
-- select id, 'Using the uploaded photo as the exact likeness reference, generate a professional portrait of this same person, keeping facial features, skin tone, and identity fully consistent and unaltered. {VARIATION}. Studio-quality lighting, soft and natural, no harsh shadows. Background: solid clean color in {TEXT_COLOR} or {BG_COLOR} (pick one, no gradients, no textures, no patterns). Wardrobe color: solid-color shirt in {MAIN_COLOR} or {TEXT_COLOR} as the base, optionally with a small {ACCENT_COLOR} accent (like a subtle collar detail or accessory) — do not introduce any colors outside this exact palette: {MAIN_COLOR}, {TEXT_COLOR}, {BG_COLOR}, {SECONDARY_BG_COLOR}, {ACCENT_COLOR}, {SOFT_ACCENT_COLOR}. Realistic photography style, sharp focus, high resolution, no illustration or cartoon effect, no text or logos in the image.'
-- from b
-- on conflict (business_id) do nothing;
--
-- with b as (select id from businesses order by id limit 1),
--      existing as (select 1 from portrait_variations where business_id = (select id from b) limit 1)
-- insert into portrait_variations (business_id, position, variation_text)
-- select b.id, v.pos, v.txt from b cross join (values
--   (1, 'Straight-on angle, confident posture, slight smile, hands loosely clasped in front'),
--   (2, 'Side profile turned toward camera, one hand resting on chin thoughtfully'),
--   (3, 'Sitting on a stool, leaning slightly forward, elbows on knees, approachable expression'),
--   (4, 'Standing with arms crossed, confident and approachable, slight head tilt'),
--   (5, 'Same pose as reference, but wearing a solid Warm Ivory button-up shirt with sleeves rolled up'),
--   (6, 'Slight low-angle shot looking up at subject, standing tall, shoulders back, calm expression'),
--   (7, 'Over-the-shoulder angle, head turned back toward camera, relaxed half-smile')
-- ) as v(pos, txt)
-- where not exists (select 1 from existing);
--
-- -- Add owner_name / owner_title to branding_profile (Visuals feature).
-- alter table branding_profile add column if not exists owner_name  text not null default '';
-- alter table branding_profile add column if not exists owner_title text not null default '';
--
-- -- visual_prompt_template (per-business) — one master graphic prompt per business.
-- create table if not exists visual_prompt_template (
--   business_id   bigint primary key references businesses(id) on delete cascade,
--   template_text text not null default ''
-- );
-- alter table visual_prompt_template enable row level security;
-- drop policy if exists "visual tpl anon all" on visual_prompt_template;
-- create policy "visual tpl anon all" on visual_prompt_template for all to anon using (true) with check (true);
