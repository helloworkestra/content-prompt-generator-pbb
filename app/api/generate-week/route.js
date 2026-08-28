import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are developing content angles for a Facebook content calendar. You will be given an audience profile (who they are, their goal, their struggles) and a list of topics already used. Your job is to invent ONE fresh, specific, NOT-yet-used angle about this audience's behavior, then work through it like this internally: imagine their messy unfiltered inner thoughts (not the polished version), what they're quietly annoyed about but never say out loud, and what they keep doing over and over even though nothing changes. From that internal work, produce a short punchy weekly theme (under 12 words, direct, a little wry, never generic or motivational-poster sounding — matching the tone of themes like 'The CRM that isn't actually automating anything' or 'Living in your head instead of in the system'), and 7 distinct daily symptom lines that are specific, emotional, and behavioral observations related to that theme — never advice, never tips, never bullet-point-sounding, each one should feel like an observation that makes the reader think 'wait, that's me.' Return ONLY a JSON object in this exact shape: {"topic": "...", "symptoms": ["line1","line2","line3","line4","line5","line6","line7"]} — no other text, no markdown, no explanation.`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Sometimes LLMs wrap JSON in ```json fences or trailing prose. Pull the first
// well-formed JSON object out of the text.
function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response.');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: 'GROQ_API_KEY is not set on the server. Add it to .env.local (local dev) or your Vercel project env vars, then redeploy.' }, 500);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Supabase env vars missing on the server.' }, 500);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Optional: allow the frontend to scope "already-used topics" to the current business.
  let businessId = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.businessId !== 'undefined') businessId = body.businessId;
  } catch {}

  const { data: profile, error: profErr } = await supabase
    .from('audience_profile')
    .select('who_they_are, their_goal, their_struggles')
    .eq('id', 1)
    .maybeSingle();
  if (profErr) return json({ error: `Failed to load audience profile: ${profErr.message}` }, 500);

  const who = (profile?.who_they_are || '').trim();
  const goal = (profile?.their_goal || '').trim();
  const struggles = (profile?.their_struggles || '').trim();

  if (!who || !goal || !struggles) {
    return json({ error: 'AUDIENCE_EMPTY' }, 400);
  }

  let existingTopics = [];
  {
    let q = supabase.from('days').select('topic');
    if (businessId) q = q.eq('business_id', businessId);
    const { data, error } = await q;
    if (error) return json({ error: `Failed to load existing topics: ${error.message}` }, 500);
    existingTopics = Array.from(new Set((data || []).map((d) => d.topic).filter(Boolean)));
  }

  const userMessage =
    `Who they are: ${who}\n` +
    `Their goal: ${goal}\n` +
    `Their struggles: ${struggles}\n` +
    `Topics already used (avoid repeating these angles): ${existingTopics.length ? existingTopics.join(', ') : '(none yet)'}`;

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  } catch (e) {
    return json({ error: `Network error calling Groq: ${e.message}` }, 502);
  }

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => '');
    return json({ error: `Groq API error (${groqRes.status}): ${text.slice(0, 400)}` }, 502);
  }

  const groqBody = await groqRes.json().catch(() => null);
  const content = groqBody?.choices?.[0]?.message?.content;
  if (!content) return json({ error: 'Groq returned no content.' }, 502);

  let parsed;
  try {
    parsed = extractJson(content);
  } catch (e) {
    return json({ error: `Failed to parse JSON from model: ${e.message}. Raw: ${content.slice(0, 300)}` }, 502);
  }

  const topic = typeof parsed.topic === 'string' ? parsed.topic.trim() : '';
  const symptoms = Array.isArray(parsed.symptoms) ? parsed.symptoms.map((s) => String(s).trim()).filter(Boolean) : [];
  if (!topic || symptoms.length !== 7) {
    return json({ error: `Model returned unexpected shape. Got topic="${topic}", symptoms.length=${symptoms.length}.` }, 502);
  }

  return json({ topic, symptoms });
}
