'use client'

import { useState, useRef, forwardRef } from 'react'
import Image from 'next/image'

interface ImageSelectorProps {
  imageUrl: string
  onSelectionChange?: (selection: { x: number; y: number; width: number; height: number }) => void
}

const ImageSelector = forwardRef<HTMLDivElement, ImageSelectorProps>(({ imageUrl, onSelectionChange }, ref) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const innerRef = useRef<HTMLDivElement>(null)
  const containerRef = (ref as React.RefObject<HTMLDivElement>) || innerRef

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent image dragging
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setStartPos({ x, y })
    setSelection({ x, y, width: 0, height: 0 })
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const currentX = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const currentY = Math.min(Math.max(0, e.clientY - rect.top), rect.height)

    const width = currentX - startPos.x
    const height = currentY - startPos.y

    const newSelection = {
      x: width > 0 ? startPos.x : currentX,
      y: height > 0 ? startPos.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    }

    // Ensure selection stays within bounds
    if (newSelection.x + newSelection.width > rect.width) {
      newSelection.width = rect.width - newSelection.x
    }
    if (newSelection.y + newSelection.height > rect.height) {
      newSelection.height = rect.height - newSelection.y
    }

    setSelection(newSelection)
  }

  const handleMouseUp = () => {
    if (selection && selection.width > 0 && selection.height > 0) {
      onSelectionChange?.(selection)
    }
    setIsDragging(false)
  }

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative aspect-video w-full border rounded-lg overflow-hidden cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Image
          src={imageUrl}
          alt="Thumbnail to select from"
          fill
          className="object-cover pointer-events-none" // Prevent image dragging
          unoptimized
          draggable={false} // Prevent image dragging
        />
        {selection && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          />
        )}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/20" />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none select-none">
        <p className="text-sm text-white bg-black/50 px-2 py-1 rounded-br-lg inline-block">
          Click and drag to select a region
        </p>
      </div>
    </div>
  )
})

ImageSelector.displayName = 'ImageSelector'

export default ImageSelector 