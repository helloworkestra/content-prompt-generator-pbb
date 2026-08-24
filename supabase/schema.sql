-- =====================================================================
-- GHL Content Tracker — Supabase schema + seed data
--
-- FRESH SETUP: paste this whole file into the Supabase SQL Editor,
-- click Run. Safe to re-run — it drops and recreates the two content
-- tables (you'll lose your generated_log history if you re-run).
--
-- IF YOU ALREADY RAN THE FIRST VERSION and just want to add the new
-- features without losing your data, scroll to the bottom "SAFE
-- UPGRADES FOR EXISTING INSTALLS" section and run only that part.
-- =====================================================================

drop table if exists generated_log;
drop table if exists days;

create table days (
  day_number   int primary key,
  week_number  int not null,
  topic        text not null,
  symptom      text not null,
  hook_combo   text not null,
  sequence     text[] not null
);

create table generated_log (
  id           bigint generated always as identity primary key,
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

create index generated_log_created_at_idx on generated_log (created_at desc);
create index generated_log_day_post_idx  on generated_log (day_number, post_index);

-- Single-row settings table (id is always 1).
create table if not exists settings (
  id         int primary key check (id = 1),
  start_date date
);
insert into settings (id, start_date) values (1, null)
  on conflict (id) do nothing;

-- --------------------------------------------------------------------
-- Row Level Security — single-user personal tool, allow anon full access.
-- --------------------------------------------------------------------
alter table days          enable row level security;
alter table generated_log enable row level security;
alter table settings      enable row level security;

drop policy if exists "days anon all"     on days;
drop policy if exists "log anon all"      on generated_log;
drop policy if exists "settings anon all" on settings;

create policy "days anon all"     on days          for all to anon using (true) with check (true);
create policy "log anon all"      on generated_log for all to anon using (true) with check (true);
create policy "settings anon all" on settings      for all to anon using (true) with check (true);

-- --------------------------------------------------------------------
-- Seed data: 30 days
-- --------------------------------------------------------------------
insert into days (day_number, week_number, topic, symptom, hook_combo, sequence) values
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
(30, 4, 'What this is actually costing you emotionally', 'Low hum of dread before busy periods',     'Pain of fear + Trigger of discomfort', array['Authority','Handraiser','Relatable','Personal Take','Disruptor']);

-- =====================================================================
-- SAFE UPGRADES FOR EXISTING INSTALLS
-- If you already ran an earlier version of this file and DON'T want to
-- lose your generated_log history, skip everything above and only run
-- the block below. It is idempotent — safe to run multiple times.
-- =====================================================================
--
-- alter table generated_log add column if not exists likes      int not null default 0;
-- alter table generated_log add column if not exists comments   int not null default 0;
-- alter table generated_log add column if not exists shares     int not null default 0;
-- alter table generated_log add column if not exists updated_at timestamptz;
--
-- create table if not exists settings (
--   id         int primary key check (id = 1),
--   start_date date
-- );
-- insert into settings (id, start_date) values (1, null) on conflict (id) do nothing;
-- alter table settings enable row level security;
-- drop policy if exists "settings anon all" on settings;
-- create policy "settings anon all" on settings for all to anon using (true) with check (true);
