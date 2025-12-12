
    let isDarkMode = false;
    let currentMode = 'balanced';
    let geminiResponse = "";
    let claudeResponse = "";
    let chatgptResponse = "";
    let summaryResponse = "";
    let geminiTime = 0;
    let claudeTime = 0;
    let chatgptTime = 0;
    let summaryTime = 0;
    // 評価カウント用
    let ratings = {
      gemini: { likes: 0, dislikes: 0 },
      claude: { likes: 0, dislikes: 0 },
      chatgpt: { likes: 0, dislikes: 0 },
      summary: { likes: 0, dislikes: 0 }
    };
        
    const modeConfigs = {
      stable: {
        temperature: 0.1,
        topK: 10,
        topP: 0.5
      },
      balanced: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      },
      creative: {
        temperature: 1.9,
        topK: 100,
        topP: 1.0
      }
    };

    window.addEventListener('DOMContentLoaded', () => {
      updateModeInfo();
    });

    function setMode(mode) {
      currentMode = mode;
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
      updateModeInfo();
    }

    function updateModeInfo() {
      const config = modeConfigs[currentMode];
      document.getElementById('modeInfo').textContent = 
        `温度: ${config.temperature} / topK: ${config.topK} / topP: ${config.topP}`;
    }

    document.getElementById('send').addEventListener('click', async () => {
      const system = document.getElementById('system').value.trim();
      const prompt = document.getElementById('prompt').value.trim();

      if (!prompt) {
        alert('プロンプトを入力してください！🍋');
        return;
      }
    try {
  // 3つのAIを並行実行して、全部終わったらまとめを作成
  await Promise.all([
    sendToGemini(system, prompt),
    sendToClaude(system, prompt),
    sendToChatGPT(system, prompt)
  ]);
  
// 全部終わったらまとめを作成
await createSummary();
// 履歴を保存
saveHistory(prompt, geminiResponse, claudeResponse, chatgptResponse, summaryResponse);
  
} catch (error) {
  console.error('AI呼び出しエラー:', error);
}
});
    async function sendToGemini(system, prompt) {
      const startTime = Date.now();  // ← この1行を追加
      const output = document.getElementById('geminiOutput');
      output.innerHTML = '<span class="loading">🍋 送信中...</span>';
      const config = modeConfigs[currentMode];

      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: system,
            prompt: prompt,
            temperature: config.temperature,
            topK: config.topK,
            topP: config.topP
          })
        });

        const data = await res.json();

        if (!res.ok) {
          geminiResponse = "❌ エラー: " + JSON.stringify(data, null, 2);
          output.textContent = geminiResponse;
          return false;
        }

        geminiResponse = data.text;
        output.textContent = geminiResponse;
        geminiTime = (Date.now() - startTime) / 1000;  // ← この1行を追加（秒単位）
        updateSpeed('gemini', geminiTime);  // ← この1行を追加
        updateWordCount('gemini', geminiResponse);  // ← この1行を追加
        return true;  // ← ここに追加（catch の前）
      } catch (e) {
        geminiResponse = "⚠️ 通信エラー: " + e.message;
        output.textContent = geminiResponse;
        return false;  // ← ここにも追加（catch の中）
      }
    }
    async function sendToChatGPT(system, prompt) {
        const startTime = Date.now();
        const output = document.getElementById('chatgptOutput');
        output.innerHTML = '<span class="loading">🤖 送信中...</span>';
        // ▼ 【追加】現在のモード設定（温度など）を取得します
        const config = modeConfigs[currentMode];
      
        try {
          const res = await fetch('/api/chatgpt', {
           method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: system,                  // ▼ 【追加】システムメッセージを送る
          prompt: prompt,
          temperature: config.temperature, // ▼ 【追加】温度設定を送る
          topP: config.topP                // ▼ 【追加】TopPも送る
          })
        });
          const data = await res.json();
          if (!res.ok) {
            chatgptResponse = "❌ エラー: " + JSON.stringify(data, null, 2);
            output.textContent = chatgptResponse;
            return false;
          }
          chatgptResponse = data.response;
          output.textContent = chatgptResponse;
          chatgptTime = (Date.now() - startTime) / 1000;  // ← 追加
          updateSpeed('chatgpt', chatgptTime);  // ← 追加
          updateWordCount('chatgpt', chatgptResponse);
          return true;  // ← この1行を追加
        } catch (e) {
          chatgptResponse = "⚠️ 通信エラー: " + e.message;
          output.textContent = chatgptResponse;
          return false;  // ← この1行を追加
        }
      }
    async function createSummary() {
      const startTime = Date.now();  // ← ここに追加！
      const summarySection = document.getElementById('summarySection');
      const summaryOutput = document.getElementById('summaryOutput');
      
  // まとめエリアを表示
  summarySection.style.display = 'block';
  summaryOutput.innerHTML = '<span class="loading">💭 3つのAIの回答をまとめています...</span>';
  
  // 3つの回答を結合
  const combinedPrompt = `
以下は同じ質問に対する3つのAIの回答です。これらを統合して、最も包括的で正確な回答を作成してください。

【Geminiの回答】
${geminiResponse}

【Claudeの回答】
${claudeResponse}

【ChatGPTの回答】
${chatgptResponse}

上記の3つの回答を総合的に分析し、最適な統合回答を作成してください。
`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: "あなたは複数のAIの回答を統合する専門家です。",
        prompt: combinedPrompt,
        temperature: 0.7,
        maxTokens: 2000
      })
    });
    const data = await res.json();
    if (!res.ok) {
      summaryResponse = "❌ エラー: " + JSON.stringify(data, null, 2);
      summaryOutput.textContent = summaryResponse;
      return;
    }
    summaryResponse = data.text;
    summaryOutput.textContent = summaryResponse;
    summaryTime = (Date.now() - startTime) / 1000;  // ← 追加
    updateSpeed('summary', summaryTime);  // ← 追加
    updateWordCount('summary', summaryResponse);
  } catch (e) {
    summaryResponse = "⚠️ 通信エラー: " + e.message;
    summaryOutput.textContent = summaryResponse;
  }
}
    
    async function sendToClaude(system, prompt) {
      const startTime = Date.now();  // ← この1行を追加
      const output = document.getElementById('claudeOutput');
      output.innerHTML = '<span class="loading">🍋 送信中...</span>';

      const config = modeConfigs[currentMode];

      try {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: system,
            prompt: prompt,
            temperature: config.temperature,
            topK: config.topK,
            topP: config.topP
          })
        });

        const data = await res.json();

        if (!res.ok) {
          claudeResponse = "❌ エラー: " + JSON.stringify(data, null, 2);
          output.textContent = claudeResponse;
          return false;
        }

        claudeResponse = data.text;
        output.textContent = claudeResponse;
        claudeTime = (Date.now() - startTime) / 1000;  // ← この1行を追加
        updateSpeed('claude', claudeTime);  // ← この1行を追加
        updateWordCount('claude', claudeResponse);  // ← この1行を追加
        return true;
      } catch (e) {
        claudeResponse = "⚠️ 通信エラー: " + e.message;
        output.textContent = claudeResponse;
        return false;
      }
    }

    function copyResponse(ai, event) {
      const text = ai === 'gemini' ? geminiResponse : ai === 'claude' ? claudeResponse : ai === 'chatgpt' ? chatgptResponse : summaryResponse;

      if (!text || text === "待機中...") {
        alert('まだ回答がありません！🍋');
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ コピー完了!';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        alert('コピーに失敗しました');
      });
    }
    function updateWordCount(ai, text) {
      const count = text.length;
      const countElement = document.getElementById(`${ai}Count`);
      if (countElement) {
        countElement.textContent = `📝 ${count.toLocaleString()}文字`;
      }
    }
    
    function updateSpeed(ai, time) {
      const speedElement = document.getElementById(`${ai}Speed`);
      if (speedElement) {
        speedElement.textContent = `⚡ ${time.toFixed(2)}秒`;
      }
    }
    function rate(ai, type) {
        const likeBtn = event.target.closest('.like-btn');
        const dislikeBtn = event.target.closest('.dislike-btn');
        
        if (type === 'like') {
          // 既に押されている場合は取り消し
          if (likeBtn && likeBtn.classList.contains('active')) {
            ratings[ai].likes--;
            likeBtn.classList.remove('active');
          } else {
            // いいねを押す
            ratings[ai].likes++;
            if (likeBtn) likeBtn.classList.add('active');
            
            // イマイチが押されていたら取り消し
            if (dislikeBtn && dislikeBtn.classList.contains('active')) {
              ratings[ai].dislikes--;
              dislikeBtn.classList.remove('active');
            }
          }
        } else {
          // 既に押されている場合は取り消し
          if (dislikeBtn && dislikeBtn.classList.contains('active')) {
            ratings[ai].dislikes--;
            dislikeBtn.classList.remove('active');
          } else {
            // イマイチを押す
            ratings[ai].dislikes++;
            if (dislikeBtn) dislikeBtn.classList.add('active');
            
            // いいねが押されていたら取り消し
            if (likeBtn && likeBtn.classList.contains('active')) {
              ratings[ai].likes--;
              likeBtn.classList.remove('active');
            }
          }
        }
        
        // 数字を更新
        document.getElementById(`${ai}Likes`).textContent = ratings[ai].likes;
        document.getElementById(`${ai}Dislikes`).textContent = ratings[ai].dislikes;
      }
      // 履歴を保存
    function saveHistory(question, gemini, claude, chatgpt, summary) {
      const history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
      
      history.unshift({
        date: new Date().toLocaleString('ja-JP'),
        question: question,
        gemini: gemini,
        claude: claude,
        chatgpt: chatgpt,
        summary: summary,
        geminiTime: geminiTime,
        claudeTime: claudeTime,
        chatgptTime: chatgptTime
      });
      
      // 最大50件まで保存
      if (history.length > 50) {
        history.pop();
      }
      
      localStorage.setItem('aiHistory', JSON.stringify(history));
    }
    
    // 履歴を表示
    function showHistory() {
      const modal = document.getElementById('historyModal');
      const historyList = document.getElementById('historyList');
      const history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
      
      if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #888;">まだ履歴がありません</p>';
      } else {
        historyList.innerHTML = history.map((item, index) => `
          <div class="history-item">
            <div class="history-item-date">${item.date}</div>
            <div class="history-item-question">📝 質問: ${item.question}</div>
            <div class="history-item-response">
              <strong>🌈 Gemini (${item.geminiTime?.toFixed(2) || '-'}秒):</strong><br>${item.gemini || '-'}<br><br>
              <strong>🤖 ChatGPT (${item.chatgptTime?.toFixed(2) || '-'}秒):</strong><br>${item.chatgpt || '-'}<br><br>
              <strong>📘 Claude (${item.claudeTime?.toFixed(2) || '-'}秒):</strong><br>${item.claude || '-'}
            </div>
          </div>
        `).join('');
      }
      
      modal.style.display = 'flex';
    }

    // 履歴を閉じる
    function closeHistory() {
      document.getElementById('historyModal').style.display = 'none';
    }
    function toggleDarkMode() {
      isDarkMode = !isDarkMode;
      const body = document.body;
      const toggleBtn = document.getElementById('darkModeToggle');

      if (isDarkMode) {
        body.classList.add('dark-mode');
        toggleBtn.textContent = '☀️';
      } else {
        body.classList.remove('dark-mode');
        toggleBtn.textContent = '🌙';
      }
    }

