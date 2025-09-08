// Dynamic Sitemap Generator for ChatWii
// This will be used for generating programmatic sitemaps as the site scales

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ hreflang: string; href: string }>;
}

export class SitemapGenerator {
  private baseUrl: string = 'https://chatwii.com';
  private urls: SitemapUrl[] = [];

  constructor(baseUrl?: string) {
    if (baseUrl) this.baseUrl = baseUrl;
  }

  // Add static pages
  addStaticPages(): void {
    const staticPages: SitemapUrl[] = [
      {
        loc: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0,
        alternates: this.generateLanguageAlternates('/')
      },
      {
        loc: '/about',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/privacy',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        loc: '/safety',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: 0.9
      },
      {
        loc: '/how-it-works',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/chat',
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: 0.9
      },
      {
        loc: '/feedback',
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.5
      }
    ];

    this.urls.push(...staticPages);
  }

  // Add language-specific pages
  addLanguagePages(languages: string[]): void {
    const mainLanguages = ['es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt', 'ru'];
    
    for (const lang of languages) {
      if (mainLanguages.includes(lang)) {
        this.urls.push({
          loc: `/${lang}/`,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.9,
          alternates: this.generateLanguageAlternates('/')
        });
        
        this.urls.push({
          loc: `/${lang}/about`,
          lastmod: new Date().toISOString(),
          changefreq: 'monthly',
          priority: 0.7
        });
      }
    }
  }

  // Add programmatic location pages
  addLocationPages(locations: Array<{country: string; city: string}>): void {
    for (const location of locations) {
      const slug = `${location.country.toLowerCase().replace(/\s+/g, '-')}/${location.city.toLowerCase().replace(/\s+/g, '-')}`;
      
      this.urls.push({
        loc: `/chat/${slug}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.7
      });
    }
  }

  // Add FAQ and guide pages
  addContentPages(contentTypes: string[]): void {
    const topics = [
      'anonymous-chat-safety',
      'how-to-chat-anonymously', 
      'online-privacy-tips',
      'safe-chatting-guide',
      'chat-etiquette',
      'reporting-inappropriate-behavior'
    ];
    
    for (const type of contentTypes) {
      for (const topic of topics) {
        this.urls.push({
          loc: `/${type}/${topic}`,
          lastmod: new Date().toISOString(),
          changefreq: type === 'faq' ? 'monthly' : 'weekly',
          priority: 0.6
        });
      }
    }
  }

  // Generate language alternates
  private generateLanguageAlternates(path: string): Array<{ hreflang: string; href: string }> {
    const languages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt', 'ru'];
    const alternates = [];
    
    for (const lang of languages) {
      alternates.push({
        hreflang: lang,
        href: lang === 'en' ? `${this.baseUrl}${path}` : `${this.baseUrl}/${lang}${path}`
      });
    }
    
    // Add x-default
    alternates.push({
      hreflang: 'x-default',
      href: `${this.baseUrl}${path}`
    });
    
    return alternates;
  }

  // Generate XML sitemap
  generateXML(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    
    for (const url of this.urls) {
      xml += '    <url>\n';
      xml += `        <loc>${this.baseUrl}${url.loc}</loc>\n`;
      
      if (url.lastmod) {
        xml += `        <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `        <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority) {
        xml += `        <priority>${url.priority}</priority>\n`;
      }
      
      if (url.alternates && url.alternates.length > 0) {
        for (const alternate of url.alternates) {
          xml += `        <xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}"/>\n`;
        }
      }
      
      xml += '    </url>\n';
    }
    
    xml += '</urlset>';
    return xml;
  }

  // Generate sitemap index for large sites
  generateSitemapIndex(sitemaps: string[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const sitemap of sitemaps) {
      xml += '    <sitemap>\n';
      xml += `        <loc>${this.baseUrl}/${sitemap}</loc>\n`;
      xml += `        <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += '    </sitemap>\n';
    }
    
    xml += '</sitemapindex>';
    return xml;
  }

  // Clear all URLs
  clear(): void {
    this.urls = [];
  }

  // Get all URLs
  getUrls(): SitemapUrl[] {
    return this.urls;
  }
}

// Helper function to generate complete sitemap
export async function generateCompleteSitemap(): Promise<string> {
  const generator = new SitemapGenerator();
  
  // Add all page types
  generator.addStaticPages();
  generator.addLanguagePages(['es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt', 'ru']);
  generator.addContentPages(['guide', 'faq', 'help']);
  
  // Add top cities (example data - replace with real data from database)
  const topLocations = [
    { country: 'United States', city: 'New York' },
    { country: 'United States', city: 'Los Angeles' },
    { country: 'United Kingdom', city: 'London' },
    { country: 'Canada', city: 'Toronto' },
    { country: 'Australia', city: 'Sydney' },
    { country: 'Germany', city: 'Berlin' },
    { country: 'France', city: 'Paris' },
    { country: 'Spain', city: 'Madrid' },
    { country: 'Japan', city: 'Tokyo' },
    { country: 'China', city: 'Shanghai' }
  ];
  
  generator.addLocationPages(topLocations);
  
  return generator.generateXML();
}

// Function to update sitemap with new content
export async function updateSitemap(newUrls: SitemapUrl[]): Promise<void> {
  // This would integrate with your build process or API
  // to dynamically update the sitemap as new content is created
  console.log(`Adding ${newUrls.length} new URLs to sitemap`);
}