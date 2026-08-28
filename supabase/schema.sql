-- =====================================================================
-- GHL Content Tracker — Supabase schema + seed data (multi-business)
--
-- FRESH SETUP: paste this whole file into the Supabase SQL Editor and
-- click Run. Safe to re-run — it drops and recreates all content tables
-- (you'll lose your generated_log history if you re-run).
--
-- ALREADY HAVE DATA? Skip the fresh-setup block below and jump to the
-- "MIGRATION FOR EXISTING INSTALLS" block at the bottom. It's
-- idempotent — wraps everything under a "Default" business without
-- dropping anything.
-- =====================================================================

drop table if exists generated_log;
drop table if exists days;
drop table if exists settings;
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
  business_id  bigint primary key references businesses(id) on delete cascade,
  start_date   date
);

-- --------------------------------------------------------------------
-- Row Level Security — single-user personal tool, allow anon full access.
-- --------------------------------------------------------------------
alter table businesses    enable row level security;
alter table days          enable row level security;
alter table generated_log enable row level security;
alter table settings      enable row level security;

drop policy if exists "biz anon all"      on businesses;
drop policy if exists "days anon all"     on days;
drop policy if exists "log anon all"      on generated_log;
drop policy if exists "settings anon all" on settings;

create policy "biz anon all"      on businesses    for all to anon using (true) with check (true);
create policy "days anon all"     on days          for all to anon using (true) with check (true);
create policy "log anon all"      on generated_log for all to anon using (true) with check (true);
create policy "settings anon all" on settings      for all to anon using (true) with check (true);

-- --------------------------------------------------------------------
-- Seed: a "Default" business + the original 30 days
-- --------------------------------------------------------------------
insert into businesses (name) values ('Default');

with b as (select id from businesses where name = 'Default')
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

with b as (select id from businesses where name = 'Default')
insert into settings (business_id, start_date) select id, null from b
on conflict (business_id) do nothing;


-- =====================================================================
-- MIGRATION FOR EXISTING INSTALLS
-- Only run this block if you already had the OLD (single-business)
-- schema and want to keep your existing data. Skip the fresh-setup
-- block above. This wraps everything under a "Default" business.
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
-- insert into businesses (name) values ('Default') on conflict (name) do nothing;
--
-- -- add business_id to days
-- alter table days add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update days set business_id = (select id from businesses where name='Default') where business_id is null;
-- alter table days alter column business_id set not null;
-- -- swap PK to (business_id, day_number)
-- alter table days drop constraint if exists days_pkey;
-- alter table days add primary key (business_id, day_number);
--
-- -- add business_id to generated_log
-- alter table generated_log add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update generated_log set business_id = (select id from businesses where name='Default') where business_id is null;
-- alter table generated_log alter column business_id set not null;
-- create index if not exists generated_log_biz_created_idx on generated_log (business_id, created_at desc);
-- create index if not exists generated_log_biz_day_post_idx on generated_log (business_id, day_number, post_index);
--
-- -- migrate settings: switch from single-row (id=1) to per-business
-- alter table settings add column if not exists business_id bigint references businesses(id) on delete cascade;
-- update settings set business_id = (select id from businesses where name='Default') where business_id is null;
-- alter table settings drop constraint if exists settings_pkey;
-- alter table settings drop constraint if exists settings_id_check;
-- alter table settings drop column if exists id;
-- alter table settings add primary key (business_id);
