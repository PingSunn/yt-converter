import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'SoundRip - YouTube to Audio Converter',
  description: 'Convert YouTube videos to MP3 or WAV audio files',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased noise-bg`}>
        {/* Animated gradient orbs */}
        <div className="gradient-orb w-[600px] h-[600px] bg-gradient-radial from-accent-pink/50 to-transparent top-[-200px] right-[-100px] animate-float opacity-50" />
        <div className="gradient-orb w-[500px] h-[500px] bg-gradient-radial from-accent-purple/50 to-transparent bottom-[-150px] left-[-100px] animate-float opacity-50" style={{ animationDirection: 'reverse', animationDelay: '-5s' }} />
        <div className="gradient-orb w-[400px] h-[400px] bg-gradient-radial from-accent-cyan/30 to-transparent top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow opacity-30" />
        
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}

