export const CONTENT_TYPES = ['Handraiser', 'Relatable', 'Personal Take', 'Disruptor', 'Authority'];

export const TEMPLATES = {
  Handraiser: `Create a Facebook post for me. Brand archetypes: Sage, Caregiver, Everyman. Content type: Handraiser — ask a direct question that invites the audience to self-identify or respond. Psychology hook combo: {HOOK_COMBO}. Target audience: US-based tax prep and financial services firm owners, small team, already using GoHighLevel but not fully set up right. Symptom to build around: {SYMPTOM}. Tone: natural, conversational, no bullet points, no emojis, no generic advice. Should feel like a direct, honest question that makes them want to answer honestly, not a sales pitch. Keep it short, spaced for readability, written the way a real person talks.`,
  Relatable: `Create a Facebook post for me. Brand archetypes: Sage, Caregiver, Everyman. Content type: Relatable — day in a life, poll/question, or a relatable story moment. Psychology hook combo: {HOOK_COMBO}. Target audience: US-based tax prep and financial services firm owners, small team, already using GoHighLevel but not fully set up right. Symptom to build around: {SYMPTOM}. Tone: natural, conversational, no bullet points, no emojis, no generic advice. Should feel like an observation that makes them think 'wait, that's me,' not a tips post. Keep it short, spaced for readability, written the way a real person talks.`,
  'Personal Take': `Create a Facebook post for me. Brand archetypes: Sage, Caregiver, Everyman. Content type: Personal Take — your own storytelling or honest opinion, grounded, not generic motivation. Psychology hook combo: {HOOK_COMBO}. Target audience: US-based tax prep and financial services firm owners, small team, already using GoHighLevel but not fully set up right. Symptom to build around: {SYMPTOM}. Tone: natural, conversational, no bullet points, no emojis, no generic advice. Should feel like a genuine reflection or take, not a lecture. Keep it short, spaced for readability, written the way a real person talks.`,
  Disruptor: `Create a Facebook post for me. Brand archetypes: Sage, Caregiver, Everyman. Content type: Disruptor — common mistake or myth buster. Psychology hook combo: {HOOK_COMBO}. Target audience: US-based tax prep and financial services firm owners, small team, already using GoHighLevel but not fully set up right. Symptom to build around: {SYMPTOM}. Tone: natural, conversational, no bullet points, no emojis, no generic advice. State the myth plainly, then disrupt it with a specific, uncomfortable truth. Should feel like a pattern-interrupt, not a rant. Keep it short, spaced for readability, written the way a real person talks.`,
  Authority: `Create a Facebook post for me. Brand archetypes: Sage, Caregiver, Everyman. Content type: Authority — case study, transformation, or result (no client names, generalized). Psychology hook combo: {HOOK_COMBO}. Target audience: US-based tax prep and financial services firm owners, small team, already using GoHighLevel but not fully set up right. Symptom to build around: {SYMPTOM}. Tone: natural, conversational, no bullet points, no emojis, no generic advice. Should feel credible and specific, not braggy or salesy. Keep it short, spaced for readability, written the way a real person talks.`,
};

const GRAPHIC_TEXT_INSTRUCTION = `

Then, after the post, on a new line under a heading exactly reading "GRAPHIC TEXT:", give me a short version of the same idea designed to sit as bold overlay text on a square social graphic. Rules for the graphic text: 1–2 lines only, max about 12 words total, punchy, plain-spoken, no hashtags, no emojis, no quotation marks, minimal punctuation, and it must stand on its own without the caption above it.`;

export function fillTemplate(contentType, symptom, hookCombo) {
  const tpl = TEMPLATES[contentType];
  if (!tpl) throw new Error(`Unknown content type: ${contentType}`);
  return (tpl + GRAPHIC_TEXT_INSTRUCTION).replace('{SYMPTOM}', symptom).replace('{HOOK_COMBO}', hookCombo);
}

export function sequenceForDay(dayNumber) {
  const base = ['Handraiser', 'Relatable', 'Personal Take', 'Disruptor', 'Authority'];
  const shift = ((dayNumber - 1) % 5 + 5) % 5;
  return [...base.slice(shift), ...base.slice(0, shift)];
}
