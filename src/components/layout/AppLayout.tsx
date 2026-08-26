import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { MobileHeader } from "./MobileHeader"
import { MobileNav } from "./MobileNav"

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  )
}

