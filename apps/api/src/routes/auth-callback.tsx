import { Hono } from "hono";
import type { HonoEnv } from "../types/bindings";

const authCallback = new Hono<HonoEnv>();

// OAuth コールバックページ
authCallback.get("/auth/callback", (c) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InspireHub - 認証中</title>
  <style>
    body {
      font-family: -apple-system, system-ui, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 1rem;
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error {
      background: rgba(255, 59, 48, 0.2);
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }
    code {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>認証処理中...</h1>
    <p>このウィンドウは自動的に閉じられます</p>

    <script>
      // URLパラメータを取得
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        document.querySelector('.container').innerHTML = \`
          <h1>認証エラー</h1>
          <div class="error">
            <p>エラー: \${error}</p>
            <p>\${params.get('error_description') || 'ログインに失敗しました'}</p>
          </div>
        \`;
      } else if (code) {
        // モバイルアプリへのディープリンク対応
        const deepLink = \`inspirehub://auth/callback?code=\${code}\`;
        const webCallback = \`https://inspirehub.wtnqk.org/auth/callback?code=\${code}\`;

        // モバイルアプリを開く試み
        window.location.href = deepLink;

        // 3秒後にWebアプリにリダイレクト（フォールバック）
        setTimeout(() => {
          window.location.href = webCallback;
        }, 3000);

        document.querySelector('.container').innerHTML += \`
          <p style="margin-top: 1rem; font-size: 0.9em;">
            アプリが開かない場合は、<a href="\${webCallback}" style="color: white;">こちら</a>をクリック
          </p>
        \`;
      } else {
        document.querySelector('.container').innerHTML = \`
          <h1>エラー</h1>
          <div class="error">
            <p>認証コードが見つかりません</p>
          </div>
        \`;
      }
    </script>
  </div>
</body>
</html>
  `;

  return c.html(html);
});

export default authCallback;
