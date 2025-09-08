import { COUNTRIES, getCountryName } from './countries';

interface CountryInfo {
  code: string;
  name: string;
}

export async function detectCountry(): Promise<CountryInfo> {
  try {
    // Try to detect country using Cloudflare headers via a simple request
    const response = await fetch('/api/country').catch(() => null);
    
    if (response?.ok) {
      const data = await response.json();
      let code = data.country || 'US';
      
      // Special mapping: Israel -> Palestine as per existing code
      if (code.toUpperCase() === 'IL') {
        code = 'PS';
      }
      
      code = code.toUpperCase();
      
      return {
        code,
        name: getCountryName(code)
      };
    }
  } catch (error) {
    console.error('Country detection failed:', error);
  }

  // Fallback: Try IPAPI for country detection
  try {
    const ipApiResponse = await fetch('https://ipapi.co/json/').catch(() => null);
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
    console.error('IPAPI country detection failed:', error);
  }

  // Fallback: Try to detect from browser timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryFromTimezone = getCountryFromTimezone(timezone);
    if (countryFromTimezone) {
      return {
        code: countryFromTimezone,
        name: getCountryName(countryFromTimezone)
      };
    }
  } catch (error) {
    console.error('Timezone-based country detection failed:', error);
  }
  
  // Final fallback to US
  return { code: 'US', name: 'United States' };
}

// Helper function to guess country from timezone
function getCountryFromTimezone(timezone: string): string | null {
  // Comprehensive timezone to country mapping
  const timezoneCountryMap: Record<string, string> = {
    // North America
    'America/New_York': 'US',
    'America/Los_Angeles': 'US', 
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Phoenix': 'US',
    'America/Anchorage': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'Canada/Eastern': 'CA',
    'Canada/Pacific': 'CA',
    'America/Mexico_City': 'MX',
    
    // Europe
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT',
    'Europe/Madrid': 'ES',
    'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE',
    'Europe/Vienna': 'AT',
    'Europe/Zurich': 'CH',
    'Europe/Stockholm': 'SE',
    'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK',
    'Europe/Helsinki': 'FI',
    'Europe/Warsaw': 'PL',
    'Europe/Prague': 'CZ',
    'Europe/Budapest': 'HU',
    'Europe/Bucharest': 'RO',
    'Europe/Sofia': 'BG',
    'Europe/Athens': 'GR',
    'Europe/Istanbul': 'TR',
    'Europe/Moscow': 'RU',
    'Europe/Kiev': 'UA',
    
    // Middle East & Central Asia
    'Asia/Baghdad': 'IQ',
    'Asia/Kuwait': 'KW',
    'Asia/Riyadh': 'SA', 
    'Asia/Qatar': 'QA',
    'Asia/Dubai': 'AE',
    'Asia/Muscat': 'OM',
    'Asia/Bahrain': 'BH',
    'Asia/Tehran': 'IR',
    'Asia/Jerusalem': 'IL',
    'Asia/Beirut': 'LB',
    'Asia/Damascus': 'SY',
    'Asia/Amman': 'JO',
    'Asia/Ankara': 'TR',
    'Asia/Yerevan': 'AM',
    'Asia/Baku': 'AZ',
    'Asia/Tbilisi': 'GE',
    'Asia/Tashkent': 'UZ',
    'Asia/Almaty': 'KZ',
    
    // South & East Asia
    'Asia/Kolkata': 'IN',
    'Asia/Delhi': 'IN',
    'Asia/Mumbai': 'IN',
    'Asia/Karachi': 'PK',
    'Asia/Dhaka': 'BD',
    'Asia/Colombo': 'LK',
    'Asia/Kathmandu': 'NP',
    'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR',
    'Asia/Shanghai': 'CN',
    'Asia/Beijing': 'CN',
    'Asia/Hong_Kong': 'HK',
    'Asia/Taipei': 'TW',
    'Asia/Manila': 'PH',
    'Asia/Singapore': 'SG',
    'Asia/Bangkok': 'TH',
    'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Jakarta': 'ID',
    'Asia/Kuala_Lumpur': 'MY',
    
    // Oceania
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU',
    'Pacific/Auckland': 'NZ',
    
    // Africa
    'Africa/Cairo': 'EG',
    'Africa/Lagos': 'NG',
    'Africa/Johannesburg': 'ZA',
    'Africa/Nairobi': 'KE',
    'Africa/Casablanca': 'MA',
    'Africa/Tunis': 'TN',
    'Africa/Algiers': 'DZ',
  };

  return timezoneCountryMap[timezone] || null;
}
