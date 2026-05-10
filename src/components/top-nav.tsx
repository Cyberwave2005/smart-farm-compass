import { ChevronDown, Search, Bell, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function TopNav() {
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

      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground ml-2">
        <Search className="h-4 w-4" />
        <span>Search fields, sensors, alerts…</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">3</Badge>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">TM</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
