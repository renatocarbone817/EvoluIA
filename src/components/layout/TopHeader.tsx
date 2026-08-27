import { Breadcrumb } from "./Breadcrumb"
import { NotificationCenter } from "./NotificationCenter"

export function TopHeader() {
  return (
    <header className="hidden md:flex sticky top-0 z-30 h-12 bg-white/95 backdrop-blur-md border-b-2 border-[#B8CBD1] px-6 items-center justify-between shadow-2xs">
      {/* Left: Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <Breadcrumb />
      </div>

      {/* Right: Central de Notificações (Sino) */}
      <div className="flex items-center gap-2">
        <NotificationCenter />
      </div>
    </header>
  )
}
