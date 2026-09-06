'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface CameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
  title?: string
}

export default function CameraCapture({ isOpen, onClose, onCapture, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setCaptured(null)
    setError(null)

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (e: unknown) {
      console.error('Camera error:', e)
      const err = e as { name?: string }
      setError(err.name === 'NotAllowedError'
        ? 'Camera access was denied. Please allow camera permissions.'
        : 'Could not access camera. Make sure your device has a camera.'
      )
    }
  }, [])

  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode)
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [isOpen, facingMode, startCamera])

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCaptured(dataUrl)

    // Stop camera to save battery
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  const retake = () => {
    setCaptured(null)
    startCamera(facingMode)
  }

  const confirm = () => {
    if (captured) {
      onCapture(captured)
      setCaptured(null)
      onClose()
    }
  }

  const flipCamera = () => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        style={{ zIndex: 10000 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            background: '#0F172A',
            borderRadius: 20,
            overflow: 'hidden',
            maxWidth: 440,
            width: '95vw',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#F1F5F9' }}>
              📸 {title || 'Capture Photo'}
            </h3>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#94A3B8',
              fontSize: '1.3rem', cursor: 'pointer', padding: '4px 8px',
            }}>✕</button>
          </div>

          {/* Viewfinder */}
          <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
            {error ? (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                <div style={{ color: '#EF4444', fontWeight: 600, marginBottom: 8 }}>Camera Unavailable</div>
                <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{error}</div>
              </div>
            ) : captured ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={captured} alt="Captured" fill style={{ objectFit: 'cover' }} unoptimized />
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Crosshair overlay */}
            {!captured && !error && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 0 0 2000px rgba(0,0,0,0.15)',
                }} />
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Controls */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '1.25rem', gap: '1.5rem', background: '#0F172A',
          }}>
            {captured ? (
              <>
                <motion.button whileTap={{ scale: 0.9 }} onClick={retake} className="btn"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#F1F5F9', padding: '0.75rem 1.5rem' }}>
                  🔄 Retake
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={confirm} className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem', fontWeight: 700 }}>
                  ✅ Confirm
                </motion.button>
              </>
            ) : (
              <>
                <motion.button whileTap={{ scale: 0.85 }} onClick={flipCamera}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.1)', color: '#F1F5F9',
                    fontSize: '1.2rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  🔄
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={takePhoto}
                  disabled={!!error}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: '#fff', border: '4px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
                  }}
                />
                <div style={{ width: 44, height: 44 }} /> {/* Spacer for centering */}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
