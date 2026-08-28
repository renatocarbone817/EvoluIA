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
import { ZoomIn, ZoomOut, RotateCw, Move, Crop, Sparkles, Loader2, RefreshCw } from "lucide-react"

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
    ctx.fillStyle = "#0F172A"
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

    // Draw mask overlay
    ctx.save()
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)"
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    
    // Cutout square with rounded corners
    const cropSize = 240
    const cropRadius = 36
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
    ctx.strokeStyle = "#A855F7"
    ctx.lineWidth = 3.5
    ctx.stroke()

    // Draw grid guide lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"
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
      <DialogContent className="max-w-md bg-white border-2 border-[#D8E5E7] shadow-2xl rounded-3xl p-0 overflow-hidden">
        {/* Header Moderno */}
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-[#EEF5F6] flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-2xs font-bold">
            <Crop className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-[#0D2329]">
              Ajustar e Enquadrar Foto
            </DialogTitle>
            <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
              Arraste para posicionar o rosto no centro e use o zoom.
            </p>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 p-5 sm:p-6 py-4 flex flex-col items-center">
          {/* Interactive Canvas Container */}
          <div className="relative rounded-3xl overflow-hidden shadow-md border-4 border-[#DDD6FE] bg-[#0F172A] select-none cursor-grab active:cursor-grabbing">
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
            <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 pointer-events-none shadow-xs">
              <Move className="w-3.5 h-3.5 text-[#A855F7]" />
              <span>Arraste para mover</span>
            </div>
          </div>

          {/* Controls Bar Moderno */}
          <div className="w-full space-y-3 bg-[#F8FAFB] p-3.5 rounded-2xl border-2 border-[#D8E5E7]">
            {/* Zoom Slider + Rotate */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="w-8 h-8 rounded-xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] flex items-center justify-center text-[#7C3AED] hover:bg-[#EDE9FE] transition-all shadow-2xs active:scale-95"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#7C3AED] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
                className="w-8 h-8 rounded-xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] flex items-center justify-center text-[#7C3AED] hover:bg-[#EDE9FE] transition-all shadow-2xs active:scale-95"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Rotate Button */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-8 h-8 rounded-xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] flex items-center justify-center text-[#7C3AED] hover:bg-[#EDE9FE] transition-all shadow-2xs active:scale-95"
                title="Girar 90 graus"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6B7C83] font-bold px-1">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => {
                  setZoom(1)
                  setOffset({ x: 0, y: 0 })
                  setRotation(0)
                }}
                className="text-[#7C3AED] hover:underline font-black flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Centralizar Foto</span>
              </button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="p-4 sm:p-5 bg-[#F8FAFB] border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs"
          >
            Cancelar
          </Button>

          <button
            type="button"
            disabled={processing}
            onClick={handleCrop}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
            <span>{processing ? "Salvando..." : "Recortar & Salvar"}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
