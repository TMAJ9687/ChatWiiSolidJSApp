/**
 * Netlify Function to read Cloudflare country headers
 * This function reads the CF-IPCountry header set by Cloudflare
 */

export async function handler(event, context) {
  try {
    // Get country from Cloudflare headers
    const cfCountry = event.headers['cf-ipcountry'] || 
                      event.headers['CF-IPCountry'] || 
                      event.headers['x-vercel-ip-country'] || // Vercel fallback
                      null;

    // Get additional Cloudflare headers for debugging
    const cfConnectingIp = event.headers['cf-connecting-ip'] || 
                          event.headers['CF-Connecting-IP'] ||
                          event.headers['x-forwarded-for'] ||
                          event.headers['x-real-ip'] ||
                          null;

    const response = {
      country: cfCountry,
      ip: cfConnectingIp,
      source: cfCountry ? 'cloudflare' : 'unknown',
      headers: {
        'cf-ipcountry': event.headers['cf-ipcountry'],
        'CF-IPCountry': event.headers['CF-IPCountry'],
        'x-vercel-ip-country': event.headers['x-vercel-ip-country']
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Country detection error:', error);
    
    return {
      statusCode: 200, // Return 200 to avoid errors in frontend
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        country: null,
        ip: null,
        source: 'error',
        error: 'Failed to detect country'
      })
    };
  }
}