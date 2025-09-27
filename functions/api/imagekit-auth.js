/**
 * Cloudflare Pages Function for ImageKit Authentication
 * Available at: your-domain.pages.dev/api/imagekit-auth
 */

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    // Basic test first
    const testResponse = {
      status: 'working',
      timestamp: Date.now(),
      hasEnv: !!env
    };

    // Check if we have environment variables
    const privateKey = env?.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      return new Response(JSON.stringify({
        error: 'ImageKit private key not configured',
        debug: 'Check Cloudflare Pages environment variables',
        envKeys: Object.keys(env || {}),
        test: testResponse
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // ImageKit authentication endpoint
    const token = generateToken();
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Generate signature
    const signature = await generateSignature(token, expire, privateKey);

    const authResponse = {
      token: token,
      expire: expire,
      signature: signature
    };

    return new Response(JSON.stringify(authResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Function error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Generate random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate HMAC-SHA1 signature for ImageKit
async function generateSignature(token, expire, privateKey) {
  const message = token + expire;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}