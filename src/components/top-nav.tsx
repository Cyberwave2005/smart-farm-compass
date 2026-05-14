import { ChevronDown, Search, Bell, Sun, Moon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MurimiAiToolbarButton } from "@/components/murimi-ai-sheet";
import { useAuth } from "@/context/auth-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function TopNav() {
  const { user, signOut } = useAuth();
  const [farm, setFarm] = useState("University of Zimbabwe Agroecology Farm");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {farm}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {["University of Zimbabwe Agroecology Farm", "Mbare Musika Horticulture Co-op", "Borrowdale Market Garden"].map((f) => (
            <DropdownMenuItem key={f} onClick={() => setFarm(f)}>{f}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 min-w-0 md:hidden" aria-hidden />

      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground ml-2 min-w-0 flex-1">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search fields, sensors, alerts…</span>
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <MurimiAiToolbarButton />
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">3</Badge>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  {(user?.email ?? "U")
                    .split("@")[0]
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
            <DropdownMenuItem
              onClick={() => {
                void signOut();
                window.location.href = "/auth/sign-in";
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
