import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/_next/',
        '/auth/',
        '/purchases/',
        '/profile/',
        '/voice-activity/',
      ],
    },
    sitemap: 'https://hamsterhub.fun/sitemap.xml',
  }
}
