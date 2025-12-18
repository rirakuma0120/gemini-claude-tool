
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

    let favorites = {
      gemini: false,
      claude: false,
      chatgpt: false,
      summary: false
    };
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
    //sendToGemini(system, prompt),
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
  summaryOutput.innerHTML = '<span class="loading">💭AIの回答をまとめています...</span>';
  
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
        chatgptTime: chatgptTime,
        //  お気に入り情報を追加
        favorites: {
          gemini: favorites.gemini,
          claude: favorites.claude,
          chatgpt: favorites.chatgpt,
          summary: favorites.summary
        }
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
        historyList.innerHTML = history.map((item, index) => {
          // ⭐ お気に入りマークを準備
          const geminiFav = item.favorites?.gemini ? ' ⭐' : '';
          const chatgptFav = item.favorites?.chatgpt ? ' ⭐' : '';
          const claudeFav = item.favorites?.claude ? ' ⭐' : '';
          
          return `
            <div class="history-item">
              <div class="history-item-date">${item.date}</div>
              <div class="history-item-question">📝 質問: ${item.question}</div>
              <div class="history-item-response">
                <strong>🌈 Gemini (${item.geminiTime?.toFixed(2) || '-'}秒)${geminiFav}:</strong><br>${item.gemini || '-'}<br><br>
                <strong>🤖 ChatGPT (${item.chatgptTime?.toFixed(2) || '-'}秒)${chatgptFav}:</strong><br>${item.chatgpt || '-'}<br><br>
                <strong>📘 Claude (${item.claudeTime?.toFixed(2) || '-'}秒)${claudeFav}:</strong><br>${item.claude || '-'}
              </div>
            </div>
          `;
        }).join('');
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
    // お気に入り機能
    function toggleFavorite(ai) {
      // お気に入り状態を反転
      favorites[ai] = !favorites[ai];
      
      // ボタンの見た目を更新
      const btn = document.getElementById(`${ai}Favorite`);
      if (favorites[ai]) {
        btn.classList.add('active');
        btn.textContent = '⭐ お気に入り済み';
      } else {
        btn.classList.remove('active');
        btn.textContent = '⭐ お気に入り';
      }
    }
    // JSONエクスポート機能
function exportJSON() {
  // localStorageから履歴を取得
  const history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
  
  // 履歴がない場合
  if (history.length === 0) {
    alert('エクスポートする履歴がありません🍋');
    return;
  }
  
  // JSON形式に変換（見やすくインデント）
  const jsonString = JSON.stringify(history, null, 2);
  
  // Blobオブジェクトを作成
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // ダウンロードリンクを作成
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // ファイル名を生成（日時付き）
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // 2024-12-18
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // 10-30-45
  link.download = `ai-history_${dateStr}_${timeStr}.json`;
  
  // ダウンロード実行
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // URLを解放
  URL.revokeObjectURL(url);
  
  alert('履歴をダウンロードしました！🍋✨');
}

// テーマ設定
const themes = {
  lemon: {
    name: 'レモン',
    emoji: '🍋',
    light: ['#FFF9C4', '#FFF59D', '#FFEB3B'],
    dark: ['#1a1a2e', '#16213e', '#0f3460'],
    accent: '#FDD835'
  },
  blueberry: {
    name: 'ブルーベリー',
    emoji: '🫐',
    light: ['#E3F2FD', '#90CAF9', '#2196F3'],
    dark: ['#0D1B2A', '#1B263B', '#415A77'],
    accent: '#2196F3'
  },
  strawberry: {
    name: 'ストロベリー',
    emoji: '🍓',
    light: ['#FCE4EC', '#F8BBD0', '#F06292'],
    dark: ['#1a0d14', '#2d1b24', '#4a2640'],
    accent: '#F06292'
  }
};

let currentTheme = 'lemon';

// ページ読み込み時にテーマを復元
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('selectedTheme') || 'lemon';
  setTheme(savedTheme, false);
});

// テーマを変更
function setTheme(themeName, save = true) {
  currentTheme = themeName;
  const theme = themes[themeName];
  
  if (!theme) return;
  
  // CSSカスタムプロパティを更新
  const root = document.documentElement;
  const colors = isDarkMode ? theme.dark : theme.light;
  
  root.style.setProperty('--gradient-1', colors[0]);
  root.style.setProperty('--gradient-2', colors[1]);
  root.style.setProperty('--gradient-3', colors[2]);
  root.style.setProperty('--accent-color', theme.accent);
  
  // 背景グラデーションを更新
  const body = document.body;
  if (isDarkMode) {
    body.style.background = `linear-gradient(270deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
  } else {
    body.style.background = `linear-gradient(270deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
  }
  body.style.backgroundSize = '600% 600%';
  
  // activeクラスを更新
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`[data-theme="${themeName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // localStorageに保存
  if (save) {
    localStorage.setItem('selectedTheme', themeName);
  }
}

// ダークモード切り替え時にテーマを再適用
const originalToggleDarkMode = toggleDarkMode;
toggleDarkMode = function() {
  originalToggleDarkMode();
  setTheme(currentTheme, false);
};

// 回答表示時のアニメーション強化
function showResponseWithAnimation(elementId, response) {
  const element = document.getElementById(elementId);
  
  // 一度透明にする
  element.style.opacity = '0';
  element.textContent = response;
  
  // フェードイン
  setTimeout(() => {
    element.style.transition = 'opacity 0.5s ease-out';
    element.style.opacity = '1';
  }, 50);
}

// まとめエリア表示時のアニメーション
function showSummaryWithAnimation() {
  const summarySection = document.getElementById('summarySection');
  summarySection.style.opacity = '0';
  summarySection.style.display = 'block';
  
  setTimeout(() => {
    summarySection.style.transition = 'opacity 0.7s ease-out';
    summarySection.style.opacity = '1';
  }, 100);
}
// CSVエクスポート機能
function exportCSV() {
  // localStorageから履歴を取得
  const history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
  
  // 履歴がない場合
  if (history.length === 0) {
    alert('エクスポートする履歴がありません🍋');
    return;
  }
  
  // CSVヘッダー
  let csvContent = '日時,質問,ChatGPT,Claude,まとめ,ChatGPT速度(秒),Claude速度(秒)\n';
  
  // 各履歴をCSV行に変換
  history.forEach(item => {
    // カンマや改行を含む場合はダブルクォートで囲む
    const escapeCSV = (text) => {
      if (!text) return '';
      // ダブルクォートをエスケープ
      text = text.replace(/"/g, '""');
      // カンマ、改行、ダブルクォートを含む場合はクォートで囲む
      if (text.includes(',') || text.includes('\n') || text.includes('"')) {
        return `"${text}"`;
      }
      return text;
    };
    
    const date = escapeCSV(item.date || '');
    const question = escapeCSV(item.question || '');
    const chatgpt = escapeCSV(item.chatgpt || '');
    const claude = escapeCSV(item.claude || '');
    const summary = escapeCSV(item.summary || '');
    const chatgptTime = item.chatgptTime?.toFixed(2) || '-';
    const claudeTime = item.claudeTime?.toFixed(2) || '-';
    
    csvContent += `${date},${question},${chatgpt},${claude},${summary},${chatgptTime},${claudeTime}\n`;
  });
  
  // BOM付きでUTF-8エンコード（Excelで文字化け防止）
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロードリンクを作成
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // ファイル名を生成（日時付き）
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  link.download = `ai-history_${dateStr}_${timeStr}.csv`;
  
  // ダウンロード実行
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // URLを解放
  URL.revokeObjectURL(url);
  
  alert('履歴をCSVでダウンロードしました！🍋✨');
}
