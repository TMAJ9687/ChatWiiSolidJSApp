import { COUNTRIES, getCountryName } from './countries';

interface CountryInfo {
  code: string;
  name: string;
}

export async function detectCountry(): Promise<CountryInfo> {
  // Primary: Try Cloudflare headers via Netlify function (only when deployed)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    try {
      const response = await fetch('/api/country', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).catch(() => null);
      
      if (response?.ok) {
        const data = await response.json();
        if (data.country) {
          let code = data.country.toUpperCase();
          
          // Special mapping: Israel -> Palestine as per existing code
          if (code === 'IL') {
            code = 'PS';
          }
          
          return {
            code,
            name: getCountryName(code)
          };
        }
      }
    } catch (error) {
      // Silently continue to IPAPI fallback
    }
  }

  // Secondary: Try IPAPI for country detection with timeout and proper error handling
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const ipApiResponse = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (ipApiResponse?.ok) {
      const ipApiData = await ipApiResponse.json();
      if (ipApiData.country_code) {
        let code = ipApiData.country_code.toUpperCase();

        // Special mapping: Israel -> Palestine as per existing code
        if (code === 'IL') {
          code = 'PS';
        }

        return {
          code,
          name: getCountryName(code)
        };
      }
    }
  } catch (error) {
    // IPAPI failed (CORS, 429, timeout, etc.) - use fallback silently
    // Don't log to avoid console spam from known issues
  }
  
  // Final fallback to US (timezone detection removed as primary method)
  return { code: 'US', name: 'United States' };
}

