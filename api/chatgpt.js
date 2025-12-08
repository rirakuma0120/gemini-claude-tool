export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ▼ 【修正1】system, temperature, topP も受け取るように変更
  const { prompt, system, temperature, topP } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // ▼ 【修正2】メッセージの配列を作成（システムメッセージがある場合は先頭に入れる）
  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages, // ▼ 【修正3】作成したmessages配列を使う
        max_tokens: 1000,
        // ▼ 【修正4】受け取った温度を使う（無い場合はデフォルト0.7）
        temperature: temperature ?? 0.7, 
        // ▼ 【修正5】top_pも反映（APIの仕様では snake_case の top_p です）
        top_p: topP ?? 1.0 
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const chatgptResponse = data.choices[0].message.content;
    res.status(200).json({ response: chatgptResponse });

  } catch (error) {
    console.error('ChatGPT API Error:', error);
    res.status(500).json({ 
      error: {
        message: error.message,
        type: 'chatgpt_error'
      }
    });
  }
}
