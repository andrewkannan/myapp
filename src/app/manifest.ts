import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AsiaMedic Roster',
    short_name: 'AM Roster',
    description: 'Staff roster management system for AsiaMedic radiology centres',
    start_url: '/schedule',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#68B04D',
    icons: [
      {
        src: '/asiamedic-logo.png',
        sizes: '192x192',
        type: 'image/png',
      }
    ],
  }
}
