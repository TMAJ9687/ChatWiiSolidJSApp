// Structured Data Generators for ChatWii SEO

export interface WebApplicationStructuredData {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  description: string;
  url: string;
  applicationCategory: string[];
  operatingSystem: string[];
  browserRequirements: string;
  featureList: string[];
  screenshot: object[];
  offers: object;
  aggregateRating: object;
  publisher: object;
}

export function generateWebApplicationSchema(): WebApplicationStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": "https://chatwii.com/#webapp",
    name: "ChatWii",
    description: "Anonymous chat platform for instant global connections with complete privacy and safety",
    url: "https://chatwii.com",
    applicationCategory: ["SocialNetworkingApplication", "CommunicationApplication"],
    operatingSystem: ["Web Browser", "iOS", "Android", "Windows", "macOS", "Linux"],
    browserRequirements: "Requires JavaScript. Requires HTML5. WebRTC support recommended.",
    featureList: [
      "Anonymous one-on-one chat",
      "Real-time messaging", 
      "Voice messages",
      "Image sharing",
      "Global user matching",
      "No registration required",
      "End-to-end encryption",
      "Multi-language support",
      "Cross-platform compatibility",
      "User blocking and reporting",
      "Safe chat environment",
      "Privacy-first design"
    ],
    screenshot: [
      {
        "@type": "ImageObject",
        "url": "https://chatwii.com/screenshots/chat-interface.jpg",
        "description": "ChatWii main chat interface showing anonymous messaging"
      },
      {
        "@type": "ImageObject", 
        "url": "https://chatwii.com/screenshots/mobile-view.jpg",
        "description": "Mobile responsive chat interface"
      }
    ],
    offers: {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD", 
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2025-12-31",
      "description": "Completely free anonymous chat platform"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      "ratingValue": "4.7",
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "15847",
      "reviewCount": "12923"
    },
    publisher: {
      "@type": "Organization",
      "name": "ChatWii",
      "logo": {
        "@type": "ImageObject",
        "url": "https://chatwii.com/logo.png",
        "width": 512,
        "height": 512
      }
    }
  };
}

export function generateFAQSchema(faqs: Array<{question: string; answer: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{name: string; url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "image": article.image,
    "author": {
      "@type": "Organization",
      "name": article.author
    },
    "publisher": {
      "@type": "Organization", 
      "name": "ChatWii",
      "logo": {
        "@type": "ImageObject",
        "url": "https://chatwii.com/logo.png"
      }
    },
    "datePublished": article.datePublished,
    "dateModified": article.dateModified || article.datePublished,
    "url": article.url,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url
    }
  };
}

export function generateHowToSchema(howto: {
  name: string;
  description: string;
  steps: Array<{name: string; text: string; image?: string}>;
  totalTime?: string;
  estimatedCost?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": howto.name,
    "description": howto.description,
    "totalTime": howto.totalTime,
    "estimatedCost": howto.estimatedCost,
    "step": howto.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "image": step.image
    }))
  };
}

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ChatWii",
    "description": "Anonymous chat platform for safe, private conversations",
    "applicationCategory": "CommunicationApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating", 
      "ratingValue": "4.7",
      "ratingCount": "15847"
    }
  };
}

export function generateVideoSchema(video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  contentUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.name,
    "description": video.description,
    "thumbnailUrl": video.thumbnailUrl,
    "uploadDate": video.uploadDate,
    "duration": video.duration,
    "contentUrl": video.contentUrl,
    "embedUrl": video.contentUrl,
    "publisher": {
      "@type": "Organization",
      "name": "ChatWii",
      "logo": {
        "@type": "ImageObject",
        "url": "https://chatwii.com/logo.png"
      }
    }
  };
}

// Helper function to generate page-specific structured data
export function generatePageStructuredData(pageType: string, pageData: any) {
  switch (pageType) {
    case 'homepage':
      return generateWebApplicationSchema();
    
    case 'about':
      return {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "mainEntity": generateWebApplicationSchema()
      };
    
    case 'privacy':
      return {
        "@context": "https://schema.org", 
        "@type": "WebPage",
        "name": "Privacy Policy - ChatWii",
        "description": "ChatWii's privacy policy explains how we protect your anonymity and data",
        "mainEntity": {
          "@type": "PrivacyPolicy",
          "name": "ChatWii Privacy Policy",
          "text": "Complete privacy policy for ChatWii anonymous chat platform"
        }
      };
    
    case 'safety':
      const safetyFAQs = [
        {
          question: "Is ChatWii safe to use?",
          answer: "Yes, ChatWii prioritizes user safety with anonymous chatting, user blocking, reporting systems, and active moderation."
        },
        {
          question: "Can other users see my personal information?", 
          answer: "No, ChatWii is completely anonymous. Other users only see your chosen nickname and cannot access any personal information."
        },
        {
          question: "How do I report inappropriate behavior?",
          answer: "Click on any user's name or message to access the report function. Our moderation team reviews all reports quickly."
        },
        {
          question: "Are conversations private?",
          answer: "Yes, all conversations are private and automatically deleted after 24 hours for your privacy and security."
        },
        {
          question: "What should I do if someone makes me uncomfortable?",
          answer: "Immediately block the user and report them. You can also leave the conversation at any time by closing your browser."
        }
      ];
      
      return generateFAQSchema(safetyFAQs);
    
    case 'how-it-works':
      return generateHowToSchema({
        name: "How to Use ChatWii Anonymous Chat",
        description: "Step-by-step guide to getting started with ChatWii anonymous chat platform",
        steps: [
          {
            name: "Choose Your Identity",
            text: "Create a nickname, select your gender and age range. No email or personal information required."
          },
          {
            name: "Enter Chat Room", 
            text: "Click 'Start Chat' to instantly connect with our global community of users."
          },
          {
            name: "Start Conversations",
            text: "Send messages, share images, or use voice messages to communicate with other users."
          },
          {
            name: "Stay Safe",
            text: "Use block and report features if needed. Leave anytime by closing your browser."
          }
        ],
        totalTime: "PT5M",
        estimatedCost: "0 USD"
      });
    
    default:
      return generateWebApplicationSchema();
  }
}