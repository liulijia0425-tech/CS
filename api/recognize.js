export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const prompt = `You are an expense receipt recognition AI for a Singapore company.
Analyze this receipt/screenshot image and extract expense details.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "amount": <number in SGD>,
  "merchant": "<merchant name, max 25 chars>",
  "category": "<exactly one of: Entertainment|Travel - National|Travel - International|General Expenses|Marketing|Freight & Courier|Printing & Stationery|Telephone & Internet|Repairs and Maintenance|Office Expenses|Conference & Seminar Expenses|Advertising|Subscriptions>",
  "date": "<YYYY-MM-DD if visible, else empty string>",
  "desc": "<Chinese description, max 50 chars, e.g. 见客户打车、见客户餐费>",
  "invoices": <number of receipts, usually 1>,
  "reason": "<one sentence in Chinese explaining category choice>"
}
Category rules:
- Entertainment: restaurant, food, drinks with clients, hawker, kopitiam
- Travel - National: Grab, Gojek, taxi, MRT, bus, local transport in Singapore
- Marketing: events, promotional materials, venue hire
- General Expenses: hotel, accommodation, miscellaneous`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: image } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Gemini error' });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
