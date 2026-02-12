# InspireHub 認証フロー

## 概要

InspireHubはGoogle ID Token検証方式を採用しています。Web/モバイル共通のAPIエンドポイント `POST /auth/verify` を使用します。

## 認証方式

```
クライアント（Web/Mobile）
    ↓ Google Sign-In SDK で id_token 取得
    ↓
POST /auth/verify { id_token }
    ↓
API が id_token を検証
    ↓
access_token / refresh_token を返却
```

---

## Web (React) フロー

### 1. セットアップ

```tsx
// main.tsx
import { GoogleOAuthProvider } from "@react-oauth/google";

<GoogleOAuthProvider clientId={env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>;
```

### 2. ログインボタン

```tsx
import { GoogleLogin } from "@react-oauth/google";

<GoogleLogin
  onSuccess={(response) => {
    // response.credential = id_token
    await fetch("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: response.credential }),
    });
  }}
  onError={() => console.error("Login failed")}
/>;
```

### 3. シーケンス図

```
User          Web App              Google              API
 │               │                    │                  │
 ├─ クリック ───→│                    │                  │
 │               ├─ ポップアップ ────→│                  │
 │               │←── id_token ───────┤                  │
 │               │                    │                  │
 │               ├─ POST /auth/verify ─────────────────→│
 │               │   { id_token }     │                  │
 │               │                    │                  │
 │               │                    │    ┌─────────────┤
 │               │                    │    │ id_token検証 │
 │               │                    │    │ ユーザー作成 │
 │               │                    │    │ JWT発行     │
 │               │                    │    └─────────────┤
 │               │                    │                  │
 │               │←── { access_token, refresh_token, user }
 │               │                    │                  │
 │←─ ログイン完了 ┤                    │                  │
```

---

## iOS (Swift) フロー

### 1. セットアップ

```swift
// AppDelegate.swift
import GoogleSignIn

func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return GIDSignIn.sharedInstance.handle(url)
}
```

### 2. ログイン実装

```swift
import GoogleSignIn

func signInWithGoogle() {
    guard let presentingVC = UIApplication.shared.windows.first?.rootViewController else { return }

    GIDSignIn.sharedInstance.signIn(withPresenting: presentingVC) { result, error in
        guard error == nil, let user = result?.user else {
            print("Error: \(error?.localizedDescription ?? "")")
            return
        }

        // id_token を取得
        guard let idToken = user.idToken?.tokenString else { return }

        // API に送信
        verifyToken(idToken: idToken)
    }
}

func verifyToken(idToken: String) {
    let url = URL(string: "https://api.inspirehub.wtnqk.org/auth/verify")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONEncoder().encode(["id_token": idToken])

    URLSession.shared.dataTask(with: request) { data, response, error in
        guard let data = data else { return }
        let result = try? JSONDecoder().decode(AuthResponse.self, from: data)
        // access_token, refresh_token, user を保存
    }.resume()
}
```

### 3. シーケンス図

```
User          iOS App              Google              API
 │               │                    │                  │
 ├─ タップ ─────→│                    │                  │
 │               ├─ signIn() ────────→│                  │
 │               │←── GIDGoogleUser ──┤                  │
 │               │    (idToken)       │                  │
 │               │                    │                  │
 │               ├─ POST /auth/verify ─────────────────→│
 │               │   { id_token }     │                  │
 │               │                    │                  │
 │               │←── { access_token, refresh_token, user }
 │               │                    │                  │
 │←─ ログイン完了 ┤                    │                  │
```

---

## Android (Kotlin) フロー

### 1. セットアップ

```kotlin
// build.gradle
dependencies {
    implementation("com.google.android.gms:play-services-auth:20.7.0")
}
```

### 2. ログイン実装

```kotlin
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions

class LoginActivity : AppCompatActivity() {

    private val RC_SIGN_IN = 9001

    private fun signIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.google_client_id))
            .requestEmail()
            .build()

        val googleSignInClient = GoogleSignIn.getClient(this, gso)
        startActivityForResult(googleSignInClient.signInIntent, RC_SIGN_IN)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)

            // id_token を取得
            val idToken = account.idToken ?: return

            // API に送信
            verifyToken(idToken)
        }
    }

    private fun verifyToken(idToken: String) {
        // Retrofit や OkHttp で POST /auth/verify
        val requestBody = mapOf("id_token" to idToken)
        apiService.verify(requestBody).enqueue(object : Callback<AuthResponse> {
            override fun onResponse(call: Call<AuthResponse>, response: Response<AuthResponse>) {
                // access_token, refresh_token, user を保存
            }
            override fun onFailure(call: Call<AuthResponse>, t: Throwable) {
                // エラー処理
            }
        })
    }
}
```

### 3. シーケンス図

```
User        Android App            Google              API
 │               │                    │                  │
 ├─ タップ ─────→│                    │                  │
 │               ├─ signInIntent ────→│                  │
 │               │←── GoogleSignInAccount ─┤             │
 │               │    (idToken)       │                  │
 │               │                    │                  │
 │               ├─ POST /auth/verify ─────────────────→│
 │               │   { id_token }     │                  │
 │               │                    │                  │
 │               │←── { access_token, refresh_token, user }
 │               │                    │                  │
 │←─ ログイン完了 ┤                    │                  │
```

---

## API リファレンス

### POST /auth/verify

Google ID Token を検証し、アクセストークンを発行します。

**Request:**

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

**Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID_TOKEN",
    "message": "Invalid or expired ID token"
  }
}
```

### POST /auth/refresh

アクセストークンをリフレッシュします。

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "expires_in": 900
}
```

### GET /auth/me

現在のユーザー情報を取得します。

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### POST /auth/logout

ログアウトします（リフレッシュトークンを無効化）。

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response (200):**

```json
{
  "success": true
}
```

---

## トークン有効期限

| トークン      | 有効期限 |
| ------------- | -------- |
| access_token  | 15分     |
| refresh_token | 30日     |

---

## Google Cloud Console 設定

### 必要な設定

1. **OAuth 2.0 クライアント ID** を作成
2. **承認済みの JavaScript 生成元** に以下を追加:
   - `http://localhost:3000` (開発)
   - `https://inspirehub.wtnqk.org` (本番)
3. iOS/Android の場合は各プラットフォーム用のクライアントIDも作成

### クライアントID

| プラットフォーム | 用途                        |
| ---------------- | --------------------------- |
| Web              | JavaScript 生成元で制限     |
| iOS              | Bundle ID で制限            |
| Android          | パッケージ名 + SHA-1 で制限 |
