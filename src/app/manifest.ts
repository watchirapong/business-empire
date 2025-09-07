import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hamstellar - All in One Facility for HamsterHub Members',
    short_name: 'Hamstellar',
    description: 'Business games, trading simulators, gacha system, university search, and community features for HamsterHub members.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/hamsterhub-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/hamsterhub-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['games', 'education', 'business', 'finance'],
    lang: 'th',
    scope: '/',
    prefer_related_applications: false,
  }
}
