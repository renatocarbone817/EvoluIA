import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"
import { MobileHeader } from "./MobileHeader"
import { MobileNav } from "./MobileNav"

export function AppLayout() {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        <TopHeader />
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overscroll-y-contain pb-24 md:pb-6 scrollbar-thin">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
