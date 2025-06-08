
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { GlobalSearch } from "./GlobalSearch"
import { Button } from "@/components/ui/button"
import { User, LogOut } from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { Lead } from "@/types/lead"

interface HeaderProps {
  user?: SupabaseUser | null
  onLogout?: () => void
  onLeadSelect?: (lead: Lead) => void
}

export function Header({ user, onLogout, onLeadSelect }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      
      <div className="flex-1">
        {onLeadSelect && <GlobalSearch onLeadSelect={onLeadSelect} />}
      </div>
      
      {user && (
        <div className="flex items-center gap-2 px-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          )}
        </div>
      )}
    </header>
  )
}
