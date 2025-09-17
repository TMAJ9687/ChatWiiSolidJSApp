import { Component, onMount } from "solid-js";
import { Title, Meta, Link } from "@solidjs/meta";
import { tabNotification } from "../../utils/tabNotification";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: string;
  locale?: string;
  alternates?: Array<{ lang: string; url: string }>;
  structuredData?: object;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

const SEOHead: Component<SEOProps> = (props) => {
  const defaultKeywords = [
    "anonymous chat",
    "private chat",
    "secure messaging",
    "online chat",
    "chat with strangers",
    "safe chat",
    "encrypted chat"
  ];

  const keywords = props.keywords ? [...props.keywords, ...defaultKeywords] : defaultKeywords;
  const currentUrl = props.url || (typeof window !== 'undefined' ? window.location.href : '');
  const imageUrl = props.image || '/images/chatwii-og-default.jpg';
  const fullTitle = props.title;

  // Update tabNotification service with the correct title when component mounts
  onMount(() => {
    // Set title immediately AND with slight delay to override any other setters
    document.title = fullTitle;

    setTimeout(() => {
      document.title = fullTitle;
      tabNotification.setOriginalTitle(fullTitle);
    }, 50);
  });

  return (
    <>
      {/* Basic Meta Tags */}
      <Title>{fullTitle}</Title>
      <Meta name="description" content={props.description} />
      <Meta name="keywords" content={keywords.join(", ")} />
      
      {/* Viewport and Mobile Optimization */}
      <Meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <Meta name="theme-color" content="#6366f1" />
      <Meta name="color-scheme" content="light dark" />
      
      {/* Robots Meta */}
      <Meta 
        name="robots" 
        content={`${props.noindex ? 'noindex' : 'index'}, ${props.nofollow ? 'nofollow' : 'follow'}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`} 
      />
      
      {/* Canonical URL */}
      {props.canonical && <Link rel="canonical" href={props.canonical} />}
      
      {/* Open Graph Tags */}
      <Meta property="og:title" content={fullTitle} />
      <Meta property="og:description" content={props.description} />
      <Meta property="og:image" content={imageUrl} />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:image:alt" content={props.title} />
      <Meta property="og:type" content={props.type || "website"} />
      <Meta property="og:url" content={currentUrl} />
      <Meta property="og:site_name" content="ChatWii" />
      <Meta property="og:locale" content={props.locale || "en_US"} />
      
      {/* Twitter Card Tags */}
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:site" content="@ChatWii" />
      <Meta name="twitter:creator" content="@ChatWii" />
      <Meta name="twitter:title" content={fullTitle} />
      <Meta name="twitter:description" content={props.description} />
      <Meta name="twitter:image" content={imageUrl} />
      <Meta name="twitter:image:alt" content={props.title} />
      
      {/* Language and Alternate URLs */}
      {props.alternates?.map((alt) => (
        <Link rel="alternate" hreflang={alt.lang} href={alt.url} />
      ))}
      <Link rel="alternate" hreflang="x-default" href={currentUrl} />
      
      {/* App-specific Meta Tags */}
      <Meta name="application-name" content="ChatWii" />
      <Meta name="apple-mobile-web-app-title" content="ChatWii" />
      <Meta name="apple-mobile-web-app-capable" content="yes" />
      <Meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <Meta name="mobile-web-app-capable" content="yes" />
      
      {/* Security Headers (Note: X-Frame-Options should be set via HTTP headers, not meta tags) */}
      <Meta http-equiv="X-Content-Type-Options" content="nosniff" />
      <Meta http-equiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Preconnect for Performance */}
      <Link rel="preconnect" href="https://fonts.googleapis.com" />
      <Link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      
      {/* Structured Data */}
      {props.structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(props.structuredData)}
        </script>
      )}
      
      {/* Default Structured Data for Website */}
      {!props.structuredData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "ChatWii",
            "alternateName": ["Anonymous Chat", "Private Chat", "Safe Chat"],
            "description": "Anonymous chat platform for instant global connections with complete privacy and safety",
            "url": "https://chatwii.com",
            "sameAs": [
              "https://twitter.com/chatwii",
              "https://facebook.com/chatwii",
              "https://instagram.com/chatwii"
            ],
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://chatwii.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      )}
    </>
  );
};

export default SEOHead;