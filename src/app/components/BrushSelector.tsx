'use client'

import { useState, useRef, useEffect, forwardRef } from 'react'
import Image from 'next/image'

interface BrushSelectorProps {
  imageUrl: string
  onSelectionComplete?: (maskDataUrl: string) => void
}

const BrushSelector = forwardRef<HTMLDivElement, BrushSelectorProps>(({ imageUrl, onSelectionComplete }, ref) => {
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [hasSelection, setHasSelection] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const displayContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const containerRef = (ref as React.RefObject<HTMLDivElement>) || innerRef
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  // Set up canvases when image changes
  useEffect(() => {
    if (!imageUrl || !containerRef.current || !canvasRef.current || !displayCanvasRef.current || !isImageLoaded) return

    const canvas = canvasRef.current
    const displayCanvas = displayCanvasRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const displayContext = displayCanvas.getContext('2d', { willReadFrequently: true })
    if (!context || !displayContext) return

    // Get the image element
    const imageElement = containerRef.current.querySelector('img')
    if (!imageElement) return

    // Get image dimensions and use original dimensions
    const imgWidth = imageElement.naturalWidth
    const imgHeight = imageElement.naturalHeight

    // Set both canvases to the original image size
    canvas.width = imgWidth
    canvas.height = imgHeight
    displayCanvas.width = imgWidth
    displayCanvas.height = imgHeight
    
    // Set up mask context (invisible canvas for AI)
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#000000'
    context.fillStyle = '#000000'
    context.lineWidth = brushSize
    context.lineCap = 'round'
    context.lineJoin = 'round'
    contextRef.current = context

    // Set up display context (visible to user)
    displayContext.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    displayContext.fillStyle = 'rgba(255, 0, 0, 0.8)'
    displayContext.lineWidth = brushSize
    displayContext.lineCap = 'round'
    displayContext.lineJoin = 'round'
    displayContextRef.current = displayContext

    setHasSelection(false)
  }, [imageUrl, brushSize, isImageLoaded])

  // Create brush cursor SVG
  useEffect(() => {
    const createBrushCursor = (size: number) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2">
          <circle cx="12" cy="12" r="4" fill="rgba(255, 0, 0, 0.5)" />
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" />
          <circle cx="12" cy="12" r="10" stroke="red" stroke-width="1" />
        </svg>
      `
      const encoded = encodeURIComponent(svg)
      return `url('data:image/svg+xml;utf8,${encoded}') ${size/2} ${size/2}, auto`
    }

    if (displayCanvasRef.current) {
      const cursorSize = Math.max(brushSize * 2, 24)
      displayCanvasRef.current.style.cursor = createBrushCursor(cursorSize)
    }
  }, [brushSize])

  const getCoordinates = (e: React.MouseEvent) => {
    if (!displayCanvasRef.current) return null

    const canvas = displayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const drawLine = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!contextRef.current || !displayContextRef.current) return

    // Draw on mask canvas (for AI)
    contextRef.current.beginPath()
    contextRef.current.moveTo(start.x, start.y)
    contextRef.current.lineTo(end.x, end.y)
    contextRef.current.stroke()
    contextRef.current.beginPath()
    contextRef.current.arc(end.x, end.y, brushSize / 2, 0, Math.PI * 2)
    contextRef.current.fill()

    // Draw on display canvas (for user)
    displayContextRef.current.beginPath()
    displayContextRef.current.moveTo(start.x, start.y)
    displayContextRef.current.lineTo(end.x, end.y)
    displayContextRef.current.stroke()
    displayContextRef.current.beginPath()
    displayContextRef.current.arc(end.x, end.y, brushSize / 2, 0, Math.PI * 2)
    displayContextRef.current.fill()
  }

  const startDrawing = (e: React.MouseEvent) => {
    e.preventDefault()
    const point = getCoordinates(e)
    if (!point || !contextRef.current || !displayContextRef.current) return

    setIsDrawing(true)
    setLastPoint(point)

    // Draw on both canvases
    contextRef.current.beginPath()
    contextRef.current.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2)
    contextRef.current.fill()

    displayContextRef.current.beginPath()
    displayContextRef.current.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2)
    displayContextRef.current.fill()

    setHasSelection(true)
  }

  const draw = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPoint) return

    const newPoint = getCoordinates(e)
    if (!newPoint) return

    drawLine(lastPoint, newPoint)
    setLastPoint(newPoint)
  }

  const endDrawing = () => {
    setIsDrawing(false)
    setLastPoint(null)

    if (hasSelection && onSelectionComplete && canvasRef.current) {
      // No need to invert the mask anymore since we're drawing in black
      const maskDataUrl = canvasRef.current.toDataURL('image/png')
      onSelectionComplete(maskDataUrl)
    }
  }

  const clearCanvas = () => {
    if (!canvasRef.current || !displayCanvasRef.current || !contextRef.current || !displayContextRef.current) return

    // Clear mask canvas (white background)
    contextRef.current.fillStyle = '#FFFFFF'
    contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    contextRef.current.fillStyle = '#000000'

    // Clear display canvas (transparent for user)
    displayContextRef.current.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height)

    setHasSelection(false)
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative aspect-video w-full border border-gray-700 rounded-lg overflow-hidden select-none bg-gray-900"
      >
        <Image
          src={imageUrl}
          alt="Image to edit"
          fill
          className="object-contain pointer-events-none"
          unoptimized
          draggable={false}
          onLoadingComplete={() => setIsImageLoaded(true)}
          priority
        />
        {/* Hidden canvas for mask generation */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        {/* Visible canvas for user interaction */}
        <canvas
          ref={displayCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="absolute inset-0 w-full h-full z-10"
          style={{ 
            touchAction: 'none',
            mixBlendMode: 'normal',
            opacity: 0.8,
            backgroundColor: 'transparent'
          }}
        />
        {/* Instruction overlay */}
        {/* <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent z-20">
          <p className="text-sm text-white font-medium">
            Paint over the areas you want to edit
          </p>
        </div> */}
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-200">Brush Size:</label>
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-md">
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32 accent-red-500"
            />
            <span className="text-sm font-medium text-gray-200 min-w-[3rem] text-center">
              {brushSize}px
            </span>
          </div>
        </div>
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear Selection
        </button>
      </div>
    </div>
  )
})

BrushSelector.displayName = 'BrushSelector'

export default BrushSelector 