export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const KEY = process.env.ANTHROPIC_API_KEY;
  const prompt = `You are an expense receipt recognition AI for a Singapore company. Analyze this receipt/screenshot image and extract expense details. Respond ONLY with valid JSON, no markdown, no explanation:
{"amount":<SGD number e.g. 23.50>,"merchant":"<name max 25 chars>","category":"<one of: Entertainment|Travel - National|Travel - International|General Expenses|Marketing|Freight & Courier|Printing & Stationery|Telephone & Internet|Repairs and Maintenance|Office Expenses|Conference & Seminar Expenses|Advertising|Subscriptions>","date":"<YYYY-MM-DD or empty>","desc":"<Chinese max 50 chars e.g. 见客户打车>","invoices":1,"reason":"<one Chinese sentence>"}
Category: Entertainment=restaurant/food/drinks; Travel - National=Grab/Gojek/taxi/MRT/bus; Marketing=events/promo; General Expenses=hotel/misc.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ debug: data });

    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
