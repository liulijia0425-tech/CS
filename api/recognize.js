export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const prompt = `You are an expense receipt recognition AI for a Singapore company. Analyze this receipt/screenshot image and extract expense details. Respond ONLY with valid JSON, no markdown, no explanation: {"amount":<number in SGD>,"merchant":"<merchant name max 25 chars>","category":"<exactly one of: Entertainment|Travel - National|Travel - International|General Expenses|Marketing|Freight & Courier|Printing & Stationery|Telephone & Internet|Repairs and Maintenance|Office Expenses|Conference & Seminar Expenses|Advertising|Subscriptions>","date":"<YYYY-MM-DD if visible else empty>","desc":"<Chinese description max 50 chars e.g. 见客户打车>","invoices":<number usually 1>,"reason":"<one sentence Chinese>"}. Category: Entertainment=restaurant/food/drinks; Travel - National=Grab/taxi/MRT/bus; Marketing=events/promo; General Expenses=hotel/misc.`;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cs-eta-eight.vercel.app',
        'X-Title': 'ClaimSnap'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
        ]}],
        max_tokens: 600
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: JSON.stringify(data.error) });
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
