// Default Portraits seed used for every new business (and for retroactive
// backfill of any business that has zero variations).

import { supabase } from './supabaseClient';

export const DEFAULT_PORTRAIT_TEMPLATE =
  'Using the uploaded photo as the exact likeness reference, generate a professional portrait of this same person, keeping facial features, skin tone, and identity fully consistent and unaltered. {VARIATION}. Studio-quality lighting, soft and natural, no harsh shadows. Background: solid clean color in {TEXT_COLOR} or {BG_COLOR} (pick one, no gradients, no textures, no patterns). Wardrobe color: solid-color shirt in {MAIN_COLOR} or {TEXT_COLOR} as the base, optionally with a small {ACCENT_COLOR} accent (like a subtle collar detail or accessory) — do not introduce any colors outside this exact palette: {MAIN_HEX}, {TEXT_HEX}, {BG_HEX}, {SECONDARY_BG_HEX}, {ACCENT_HEX}, {SOFT_ACCENT_HEX}. Realistic photography style, sharp focus, high resolution, no illustration or cartoon effect, no text or logos in the image.';

export const DEFAULT_PORTRAIT_VARIATIONS = [
  'Straight-on angle, confident posture, slight smile, hands loosely clasped in front',
  'Side profile turned toward camera, one hand resting on chin thoughtfully',
  'Sitting on a stool, leaning slightly forward, elbows on knees, approachable expression',
  'Standing with arms crossed, confident and approachable, slight head tilt',
  'Same pose as reference, but wearing a solid Warm Ivory #FAF9F5 button-up shirt with sleeves rolled up',
  'Slight low-angle shot looking up at subject, standing tall, shoulders back, calm expression',
  'Over-the-shoulder angle, head turned back toward camera, relaxed half-smile',
  '45-degree angle, walking motion frozen mid-step, natural and dynamic',
  'Leaning against a plain wall, one foot crossed over the other, arms relaxed at sides',
  'Hand gesturing slightly as if mid-explanation, open and engaging expression',
  'Seated at a desk, forearms resting on the table, leaning in slightly, focused expression',
  'Standing with one hand in pocket, other hand relaxed, weight shifted to one side',
  'Arms open in a welcoming gesture, warm approachable smile',
  'Same pose as reference, but wearing a solid Deep Sage #356B52 crew-neck shirt, sleeves at normal length',
  'Same pose as reference, but wearing a solid Green-Charcoal #26332D quarter-zip pullover',
  'Same pose as reference, but wearing a solid Warm Ivory #FAF9F5 collared shirt with top button undone',
  'Same pose as reference, but wearing a solid Deep Sage #356B52 button-up with sleeves rolled to the elbow',
  'Warm genuine smile, relaxed eyes',
  'Neutral, confident, slight furrow of focus',
  'Light laugh, natural and candid',
  'Close-up headshot, shoulders and up only',
  'Medium shot, waist and up',
  'Full-body shot, standing, environment kept minimal and on-brand',
];

// Seed template + variations for a business. Idempotent — skips if already
// seeded (template exists OR variations exist for that business).
export async function seedPortraitsForBusiness(businessId) {
  if (!businessId) return;

  // Template: insert only if none exists.
  const { data: existingTpl } = await supabase
    .from('portrait_base_template')
    .select('business_id')
    .eq('business_id', businessId)
    .maybeSingle();
  if (!existingTpl) {
    await supabase.from('portrait_base_template').insert({
      business_id: businessId,
      template_text: DEFAULT_PORTRAIT_TEMPLATE,
    });
  }

  // Variations: insert only if the business has zero.
  const { count } = await supabase
    .from('portrait_variations')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);
  if ((count || 0) === 0) {
    const rows = DEFAULT_PORTRAIT_VARIATIONS.map((txt, i) => ({
      business_id: businessId,
      position: i + 1,
      variation_text: txt,
    }));
    await supabase.from('portrait_variations').insert(rows);
  }
}
