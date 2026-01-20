// JWTトークンをデコードして確認するスクリプト

const token = process.argv[2];

if (!token) {
  console.log("使い方: bun decode-jwt.js <JWT_TOKEN>");
  process.exit(1);
}

try {
  // JWTを.で分割
  const [header, payload, signature] = token.split('.');

  // Base64URLデコード
  const decodeBase64Url = (str) => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString());
  };

  const decodedHeader = decodeBase64Url(header);
  const decodedPayload = decodeBase64Url(payload);

  console.log('\n=== JWT Header ===');
  console.log(JSON.stringify(decodedHeader, null, 2));

  console.log('\n=== JWT Payload ===');
  console.log(JSON.stringify(decodedPayload, null, 2));

  // 有効期限の確認
  if (decodedPayload.exp) {
    const expDate = new Date(decodedPayload.exp * 1000);
    const now = new Date();
    const isExpired = expDate < now;

    console.log('\n=== 有効期限 ===');
    console.log(`期限: ${expDate.toLocaleString()}`);
    console.log(`現在: ${now.toLocaleString()}`);
    console.log(`状態: ${isExpired ? '❌ 期限切れ' : '✅ 有効'}`);
  }

  if (decodedPayload.iat) {
    const iatDate = new Date(decodedPayload.iat * 1000);
    console.log(`発行: ${iatDate.toLocaleString()}`);
  }

} catch (error) {
  console.error('JWTのデコードに失敗しました:', error.message);
}