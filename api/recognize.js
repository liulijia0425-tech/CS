export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const KEY = process.env.OPENROUTER_API_KEY;
  const prompt = `You are an expense receipt OCR system. Your PRIMARY task is to extract the TOTAL AMOUNT from this receipt/screenshot.

AMOUNT EXTRACTION RULES:
- Look for: Total, Amount, Grand Total, Sub Total, 总计, 合计, 应付, TOTAL, Price
- For Grab/taxi receipts: look for the fare amount, trip total
- For restaurant receipts: look for the final total at the bottom
- Amount is ALWAYS a number like 12.50 or 128.00
- Currency is SGD (Singapore Dollars)
- If you see multiple amounts, take the LARGEST or FINAL total

Respond ONLY with valid JSON, no markdown:
{"amount":<number, e.g. 23.50>,"merchant":"<name max 25 chars>","category":"<one of: Entertainment|Travel - National|Travel - International|General Expenses|Marketing|Freight & Courier|Printing & Stationery|Telephone & Internet|Repairs and Maintenance|Office Expenses|Conference & Seminar Expenses|Advertising|Subscriptions>","date":"<YYYY-MM-DD or empty>","desc":"<Chinese max 50 chars, e.g. 见客户打车>","invoices":1,"reason":"<one Chinese sentence>"}

Category: Entertainment=restaurant/food/drinks with clients; Travel - National=Grab/Gojek/taxi/MRT/bus; Marketing=events/promo; General Expenses=hotel/misc.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cs-eta-eight.vercel.app',
        'X-Title': 'ClaimSnap'
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
          ]
        }],
        max_tokens: 600
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ debug: data });

    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
