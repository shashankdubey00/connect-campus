import { useState, useRef, useEffect } from 'react'
import './ProfilePictureCropModal.css'

const ProfilePictureCropModal = ({ imageFile, onClose, onCrop }) => {
  const [imageSrc, setImageSrc] = useState(null)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, size: 200 })
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const cropAreaRef = useRef(cropArea)
  const dragStartRef = useRef(dragStart)
  const resizeStartRef = useRef(resizeStart)
  
  // Keep refs in sync with state
  useEffect(() => {
    cropAreaRef.current = cropArea
  }, [cropArea])
  
  useEffect(() => {
    dragStartRef.current = dragStart
  }, [dragStart])
  
  useEffect(() => {
    resizeStartRef.current = resizeStart
  }, [resizeStart])

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target.result)
      }
      reader.readAsDataURL(imageFile)
    }
  }, [imageFile])

  useEffect(() => {
    if (imageSrc && imageRef.current) {
      // Center the crop area initially
      const img = imageRef.current
      img.onload = () => {
        const minSize = Math.min(img.naturalWidth, img.naturalHeight)
        const initialSize = Math.min(minSize * 0.7, 350)
        const centerX = (img.width - initialSize) / 2
        const centerY = (img.height - initialSize) / 2
        setCropArea({
          x: centerX,
          y: centerY,
          size: initialSize
        })
      }
    }
  }, [imageSrc])

  const getClientCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if clicking on resize handle
    if (e.target.classList.contains('crop-handle') || e.target.closest('.crop-handle')) {
      setIsResizing(true)
      const coords = getClientCoordinates(e)
      setResizeStart({
        x: coords.x,
        y: coords.y,
        size: cropArea.size
      })
    } else if (e.target.classList.contains('crop-overlay') || e.target.closest('.crop-overlay')) {
      // Allow dragging from anywhere on the crop overlay
      setIsDragging(true)
      const rect = containerRef.current.getBoundingClientRect()
      const coords = getClientCoordinates(e)
      setDragStart({
        x: coords.x - rect.left - cropArea.x,
        y: coords.y - rect.top - cropArea.y
      })
    }
  }
  

  const handleMouseMove = (e) => {
    if (!imageRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const img = imageRef.current
    const coords = getClientCoordinates(e)
    const currentCropArea = cropAreaRef.current
    const currentDragStart = dragStartRef.current
    const currentResizeStart = resizeStartRef.current

    if (isResizing) {
      const deltaX = coords.x - currentResizeStart.x
      const deltaY = coords.y - currentResizeStart.y
      // Use average of both deltas for smoother resizing
      const delta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2
      const newSize = currentResizeStart.size + (deltaX + deltaY > 0 ? delta : -delta)
      const minSize = 120
      const maxSize = Math.min(img.width, img.height) * 0.95
      const constrainedSize = Math.max(minSize, Math.min(maxSize, newSize))

      // Keep crop area within bounds
      const maxX = img.width - constrainedSize
      const maxY = img.height - constrainedSize
      const newX = Math.max(0, Math.min(currentCropArea.x, maxX))
      const newY = Math.max(0, Math.min(currentCropArea.y, maxY))

      setCropArea({
        x: newX,
        y: newY,
        size: constrainedSize
      })
    } else if (isDragging) {
      const newX = coords.x - rect.left - currentDragStart.x
      const newY = coords.y - rect.top - currentDragStart.y

      // Keep crop area within image bounds with some padding
      const maxX = img.width - currentCropArea.size
      const maxY = img.height - currentCropArea.size
      const constrainedX = Math.max(0, Math.min(newX, maxX))
      const constrainedY = Math.max(0, Math.min(newY, maxY))

      setCropArea({
        ...currentCropArea,
        x: constrainedX,
        y: constrainedY
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleMouseMove, { passive: false })
      document.addEventListener('touchend', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleMouseMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, isResizing])

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return

    const img = imageRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Calculate crop coordinates in original image dimensions
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    const cropX = cropArea.x * scaleX
    const cropY = cropArea.y * scaleY
    const cropSize = cropArea.size * scaleX

    // Set canvas size
    canvas.width = 400
    canvas.height = 400

    // Draw cropped and resized image
    ctx.drawImage(
      img,
      cropX, cropY, cropSize, cropSize,
      0, 0, 400, 400
    )

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], 'profile-picture.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        onCrop(croppedFile)
      }
    }, 'image/jpeg', 0.9)
  }

  if (!imageSrc) return null

  return (
    <div className="crop-modal-overlay" onClick={onClose}>
      <div className="crop-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-header">
          <h2>Crop your new profile picture</h2>
          <button className="crop-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div 
          className="crop-container"
          ref={containerRef}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Preview"
            className="crop-image"
          />
          <div
            className="crop-overlay"
            style={{
              left: `${cropArea.x}px`,
              top: `${cropArea.y}px`,
              width: `${cropArea.size}px`,
              height: `${cropArea.size}px`,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="crop-handle crop-handle-top-left" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}></div>
            <div className="crop-handle crop-handle-top-right" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}></div>
            <div className="crop-handle crop-handle-bottom-left" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}></div>
            <div className="crop-handle crop-handle-bottom-right" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}></div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="crop-modal-footer">
          <button className="crop-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="crop-save-btn" onClick={handleCrop}>
            Set new profile picture
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePictureCropModal

