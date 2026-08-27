import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { ZoomIn, ZoomOut, RotateCw, Move, Crop, Sparkles } from "lucide-react"

interface ImageCropperModalProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
}

export function ImageCropperModal({
  open,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Load image when imageSrc changes
  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = imageSrc
      img.onload = () => {
        imageRef.current = img
        setImageLoaded(true)
        setZoom(1)
        setRotation(0)
        setOffset({ x: 0, y: 0 })
      }
    } else {
      setImageLoaded(false)
    }
  }, [open, imageSrc])

  // Redraw preview canvas
  useEffect(() => {
    if (!open || !imageLoaded || !canvasRef.current || !imageRef.current) return
    drawCanvas()
  }, [open, imageLoaded, zoom, rotation, offset])

  function drawCanvas() {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 320 // Display canvas dimensions
    canvas.width = size
    canvas.height = size

    // Clear background
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = "#14282F"
    ctx.fillRect(0, 0, size, size)

    ctx.save()
    // Move to center
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // Calculate aspect ratio fit
    const imgAspect = img.width / img.height
    let drawWidth = size
    let drawHeight = size

    if (imgAspect > 1) {
      drawWidth = size * imgAspect
      drawHeight = size
    } else {
      drawWidth = size
      drawHeight = size / imgAspect
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()

    // Draw circular mask overlay
    ctx.save()
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    // Cutout square with rounded corners
    const cropSize = 240
    const cropRadius = 32
    const cropX = (size - cropSize) / 2
    const cropY = (size - cropSize) / 2

    ctx.moveTo(cropX + cropRadius, cropY)
    ctx.lineTo(cropX + cropSize - cropRadius, cropY)
    ctx.quadraticCurveTo(cropX + cropSize, cropY, cropX + cropSize, cropY + cropRadius)
    ctx.lineTo(cropX + cropSize, cropY + cropSize - cropRadius)
    ctx.quadraticCurveTo(cropX + cropSize, cropY + cropSize, cropX + cropSize - cropRadius, cropY + cropSize)
    ctx.lineTo(cropX + cropRadius, cropY + cropSize)
    ctx.quadraticCurveTo(cropX, cropY + cropSize, cropX, cropY + cropSize - cropRadius)
    ctx.lineTo(cropX, cropY + cropRadius)
    ctx.quadraticCurveTo(cropX, cropY, cropX + cropRadius, cropY)
    ctx.closePath()
    ctx.fill("evenodd")

    // Draw border around crop region
    ctx.strokeStyle = "#63C7B2"
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw grid guide lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    // Horizontal grid
    ctx.moveTo(cropX, cropY + cropSize / 3)
    ctx.lineTo(cropX + cropSize, cropY + cropSize / 3)
    ctx.moveTo(cropX, cropY + (cropSize * 2) / 3)
    ctx.lineTo(cropX + cropSize, cropY + (cropSize * 2) / 3)
    // Vertical grid
    ctx.moveTo(cropX + cropSize / 3, cropY)
    ctx.lineTo(cropX + cropSize / 3, cropY + cropSize)
    ctx.moveTo(cropX + (cropSize * 2) / 3, cropY)
    ctx.lineTo(cropX + (cropSize * 2) / 3, cropY + cropSize)
    ctx.stroke()

    ctx.restore()
  }

  // Pointer drag handlers
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  // Touch drag handlers for mobile / trackpad
  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      })
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!isDragging || e.touches.length !== 1) return
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  function handleTouchEnd() {
    setIsDragging(false)
  }

  // Generate cropped output blob
  async function handleCrop() {
    const img = imageRef.current
    if (!img) return

    setProcessing(true)
    try {
      const outputCanvas = document.createElement("canvas")
      const outputSize = 600 // Output image resolution (600x600 retina)
      outputCanvas.width = outputSize
      outputCanvas.height = outputSize

      const ctx = outputCanvas.getContext("2d")
      if (!ctx) return

      const scaleRatio = outputSize / 240 // 240 is cropSize on display canvas

      ctx.save()
      ctx.translate(outputSize / 2 + offset.x * scaleRatio, outputSize / 2 + offset.y * scaleRatio)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom * scaleRatio, zoom * scaleRatio)

      const imgAspect = img.width / img.height
      let drawWidth = 320
      let drawHeight = 320

      if (imgAspect > 1) {
        drawWidth = 320 * imgAspect
        drawHeight = 320
      } else {
        drawWidth = 320
        drawHeight = 320 / imgAspect
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      ctx.restore()

      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob)
          }
          setProcessing(false)
        },
        "image/jpeg",
        0.92
      )
    } catch {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-white border-2 border-[#D8E5E7] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#245C6B]">
            <Crop className="w-5 h-5" />
            <DialogTitle>Ajustar e Enquadrar Foto</DialogTitle>
          </div>
          <p className="text-xs text-[#6B7C83]">
            Arraste para posicionar o rosto no centro e use o zoom para enquadrar.
          </p>
        </DialogHeader>

        <DialogBody className="space-y-4 py-2 flex flex-col items-center">
          {/* Interactive Canvas Container */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border-4 border-[#245C6B] bg-[#14282F] select-none cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="block"
            />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 pointer-events-none">
              <Move className="w-3 h-3 text-[#63C7B2]" />
              Arraste para mover
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full space-y-3 bg-[#EEF5F6]/60 p-3 rounded-2xl border border-[#D8E5E7]">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="w-8 h-8 rounded-xl bg-white border border-[#D8E5E7] flex items-center justify-center text-[#245C6B] hover:bg-[#245C6B] hover:text-white transition-colors"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#245C6B] cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
                className="w-8 h-8 rounded-xl bg-white border border-[#D8E5E7] flex items-center justify-center text-[#245C6B] hover:bg-[#245C6B] hover:text-white transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Rotate Button */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-8 h-8 rounded-xl bg-white border border-[#D8E5E7] flex items-center justify-center text-[#245C6B] hover:bg-[#245C6B] hover:text-white transition-colors"
                title="Girar 90 graus"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6B7C83] font-semibold px-1">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => {
                  setZoom(1)
                  setOffset({ x: 0, y: 0 })
                  setRotation(0)
                }}
                className="text-[#245C6B] hover:underline"
              >
                Centralizar Foto
              </button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            loading={processing}
            onClick={handleCrop}
            className="bg-[#245C6B] hover:bg-[#19323A] text-white font-black gap-2 shadow-[0_4px_0_0_#143741]"
          >
            <Crop className="w-4 h-4" />
            Recortar & Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
