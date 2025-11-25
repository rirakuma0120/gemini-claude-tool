export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { system, prompt, temperature, topK, topP } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        { role: "user", parts: [{ text: system }] },
        { role: "model", parts: [{ text: "理解しました" }] },
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: temperature || 0.7,
        topK: topK || 40,
        topP: topP || 0.95,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "(テキストなし)";
    res.status(200).json({ text });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
