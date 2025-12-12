'use client'

import { useState } from 'react'
import Image from 'next/image'

interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  channel: string
  views: number
}

type ConversionStatus = 'idle' | 'fetching' | 'converting' | 'completed' | 'error'

export default function Home() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [status, setStatus] = useState<ConversionStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [conversionId, setConversionId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatViews = (views: number) => {
    if (!views) return '0 views'
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  const isValidYouTubeUrl = (url: string) => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  const pollStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/status/${id}`)
      const data = await response.json()
      
      if (data.status === 'processing') {
        setProgress(data.progress || 0)
        setTimeout(() => pollStatus(id), 1000)
      } else if (data.status === 'completed') {
        setStatus('completed')
        setProgress(100)
      } else if (data.status === 'error') {
        setStatus('error')
        setError(data.error || 'Conversion failed')
      }
    } catch (err) {
      setStatus('error')
      setError('Failed to check conversion status')
    }
  }

  const handleConvert = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      setStatus('error')
      return
    }

    if (!isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL')
      setStatus('error')
      return
    }

    setStatus('fetching')
    setError('')
    setProgress(0)

    try {
      // Fetch video info
      const infoResponse = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!infoResponse.ok) {
        const errorData = await infoResponse.json()
        throw new Error(errorData.error || 'Failed to fetch video info')
      }

      const info = await infoResponse.json()
      setVideoInfo(info)
      setStatus('converting')

      // Start conversion
      const convertResponse = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format })
      })

      if (!convertResponse.ok) {
        const errorData = await convertResponse.json()
        throw new Error(errorData.error || 'Failed to start conversion')
      }

      const { conversionId: id } = await convertResponse.json()
      setConversionId(id)
      
      // Start polling for status
      pollStatus(id)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDownload = () => {
    if (conversionId) {
      window.location.href = `/api/download/${conversionId}`
    }
  }

  const handleReset = () => {
    setUrl('')
    setStatus('idle')
    setProgress(0)
    setVideoInfo(null)
    setConversionId(null)
    setError('')
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
        {/* Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-pink to-accent-purple rounded-2xl flex items-center justify-center shadow-lg shadow-accent-pink/30">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <span className="text-3xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent tracking-tight">
              SoundRip
            </span>
          </div>
          <p className="text-white/60 text-lg">Extract crystal-clear audio from YouTube</p>
        </header>

        {/* Main Card */}
        <div className="bg-dark-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* URL Input */}
          <div className="mb-7">
            <div className="flex items-center bg-black/30 border border-white/10 rounded-2xl p-1 focus-within:border-accent-pink focus-within:ring-4 focus-within:ring-accent-pink/10 transition-all">
              <div className="px-4 text-white/40">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                placeholder="Paste YouTube URL here..."
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm py-3"
                disabled={status === 'fetching' || status === 'converting'}
              />
              <button
                onClick={handlePaste}
                className="p-3 mr-1 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all"
                title="Paste from clipboard"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Format Toggle */}
          <div className="mb-7">
            <span className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Output Format</span>
            <div className="grid grid-cols-2 gap-0 bg-black/30 rounded-2xl p-1.5 relative">
              <div 
                className={`absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] bg-gradient-to-r from-accent-pink to-accent-purple rounded-xl transition-transform duration-300 ${format === 'wav' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}
              />
              <button
                onClick={() => setFormat('mp3')}
                className={`relative z-10 py-4 px-5 rounded-xl text-center transition-colors ${format === 'mp3' ? 'text-white' : 'text-white/50 hover:text-white/70'}`}
              >
                <span className="block text-lg font-semibold">MP3</span>
                <span className="block text-xs opacity-70">Compressed • Smaller</span>
              </button>
              <button
                onClick={() => setFormat('wav')}
                className={`relative z-10 py-4 px-5 rounded-xl text-center transition-colors ${format === 'wav' ? 'text-white' : 'text-white/50 hover:text-white/70'}`}
              >
                <span className="block text-lg font-semibold">WAV</span>
                <span className="block text-xs opacity-70">Lossless • Larger</span>
              </button>
            </div>
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={status === 'fetching' || status === 'converting'}
            className="w-full py-5 bg-gradient-to-r from-accent-pink to-accent-purple rounded-2xl text-white font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-accent-pink/30 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <span>Convert</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>

        {/* Video Preview */}
        {videoInfo && (status === 'converting' || status === 'completed') && (
          <div className="bg-dark-800/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden mb-6 animate-slide-up">
            <div className="relative aspect-video">
              <Image
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 rounded-md font-mono text-sm">
                {formatDuration(videoInfo.duration)}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{videoInfo.title}</h3>
              <p className="text-white/60 text-sm mb-2">{videoInfo.channel}</p>
              <span className="text-white/40 text-sm">{formatViews(videoInfo.views)}</span>
            </div>
          </div>
        )}

        {/* Progress Card */}
        {(status === 'fetching' || status === 'converting') && (
          <div className="bg-dark-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-accent-pink to-accent-purple rounded-full flex items-center justify-center animate-spin">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
                <span className="text-white/70">
                  {status === 'fetching' ? 'Fetching video info...' : 'Converting...'}
                </span>
              </div>
              <span className="font-mono text-lg font-semibold text-accent-pink">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-accent-pink to-accent-purple rounded-full transition-all duration-300 progress-animate"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Card */}
        {status === 'completed' && (
          <div className="bg-dark-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center mb-6 animate-slide-up">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 animate-scale-in">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Conversion Complete!</h3>
            <p className="text-white/60 mb-6">Your audio file is ready to download</p>
            <button
              onClick={handleDownload}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Audio
            </button>
            <button
              onClick={handleReset}
              className="w-full py-4 border border-white/10 hover:bg-white/5 rounded-2xl text-white/70 hover:text-white font-medium transition-all"
            >
              Convert Another
            </button>
          </div>
        )}

        {/* Error Card */}
        {status === 'error' && (
          <div className="bg-dark-800/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 text-center mb-6 animate-shake">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
            <p className="text-white/60 mb-6">{error || 'Please check the URL and try again'}</p>
            <button
              onClick={handleReset}
              className="py-4 px-8 bg-red-500 hover:bg-red-600 rounded-2xl text-white font-semibold transition-all hover:-translate-y-0.5"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-white/40 text-sm mt-auto pt-8">
          <p>
            Built for music lovers • Requires{' '}
            <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer" className="text-accent-pink hover:text-accent-purple transition-colors">
              yt-dlp
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}

