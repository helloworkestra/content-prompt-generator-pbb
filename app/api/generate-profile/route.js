export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You turn a business owner's raw answers about their ideal client into three polished audience profile fields for a content marketing system. Given answers to 5 questions (who the client is, what they want, what frustrates them, what they've already tried, what they're quietly embarrassed about), write: who_they_are (a specific, concrete description of the audience, not generic), their_goal (what they actually want, in plain direct language), and their_struggles (a short paragraph naming their real emotional struggles — not surface-level pain points, the underlying feelings). Keep all three grounded in the user's actual answers, don't invent unrelated details. Return ONLY a JSON object in this exact shape: {"who_they_are": "...", "their_goal": "...", "their_struggles": "..."} — no other text, no markdown, no explanation.`;

const QUESTIONS = [
  'Who is your ideal client? (industry, role, team size — be specific)',
  'What do they want more of in their business right now?',
  "What's frustrating them about how things currently run day to day?",
  "What have they already tried or paid for that didn't fully fix the problem?",
  "What do they feel embarrassed or quietly annoyed about, but wouldn't say out loud to a peer?",
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response.');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: 'GROQ_API_KEY is not set on the server.' }, 500);
  }

  let answers;
  try {
    const body = await req.json();
    answers = Array.isArray(body?.answers) ? body.answers : null;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  if (!answers || answers.length !== 5 || answers.some((a) => typeof a !== 'string' || !a.trim())) {
    return json({ error: 'All 5 answers are required.' }, 400);
  }

  const userMessage = QUESTIONS
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i].trim()}`)
    .join('\n\n');

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        temperature: 0.6,
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
    return json({ error: `Failed to parse JSON from model: ${e.message}` }, 502);
  }

  const who_they_are = typeof parsed.who_they_are === 'string' ? parsed.who_they_are.trim() : '';
  const their_goal = typeof parsed.their_goal === 'string' ? parsed.their_goal.trim() : '';
  const their_struggles = typeof parsed.their_struggles === 'string' ? parsed.their_struggles.trim() : '';
  if (!who_they_are || !their_goal || !their_struggles) {
    return json({ error: 'Model returned unexpected shape.' }, 502);
  }

  return json({ who_they_are, their_goal, their_struggles });
}
