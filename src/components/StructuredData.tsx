import Script from 'next/script';

interface StructuredDataProps {
  type?: 'website' | 'organization' | 'webapplication';
  data?: any;
}

export default function StructuredData({ type = 'website', data }: StructuredDataProps) {
  const getStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type === 'website' ? "WebSite" : type === 'organization' ? "Organization" : "WebApplication",
      "name": "Hamstellar",
      "alternateName": "HamsterHub",
      "description": "All in One Facility for HamsterHub Members - Business games, trading simulators, gacha system, university search, and community features.",
      "url": "https://hamsterhub.fun",
      "logo": "https://hamsterhub.fun/hamsterhub-logo.png",
      "sameAs": [
        "https://discord.gg/hamsterhub"
      ],
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://hamsterhub.fun/university-search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    if (type === 'webapplication') {
      return {
        ...baseData,
        "@type": "WebApplication",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "Business Games",
          "Trading Simulators", 
          "Gacha System",
          "University Search",
          "Community Features",
          "Discord Integration"
        ]
      };
    }

    if (type === 'organization') {
      return {
        ...baseData,
        "@type": "Organization",
        "foundingDate": "2024",
        "founder": {
          "@type": "Person",
          "name": "HamsterHub Team"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": ["Thai", "English"]
        }
      };
    }

    return baseData;
  };

  const structuredData = data || getStructuredData();

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2),
      }}
    />
  );
}
