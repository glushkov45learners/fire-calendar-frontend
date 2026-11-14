import { Outlet } from 'react-router'
import { TooltipProvider } from '@/shared/ui/tooltip'

export function Layout() {
  return (
    <TooltipProvider delayDuration={150}>
      <Outlet />
    </TooltipProvider>
  )
}
