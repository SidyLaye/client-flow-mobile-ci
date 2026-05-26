import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Plus, Search, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/api-types";

export function TopBar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications.list(),
    retry: false,
    refetchInterval: 60_000,
  });

  const items = useMemo<AppNotification[]>(() => {
    const data = notifQuery.data;
    if (!data) return [];
    return Array.isArray(data) ? data : data.results;
  }, [notifQuery.data]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher client, document, tâche..."
            className="pl-9 w-72 h-9 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-card"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => navigate("/clients/nouveau")}>
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Nouveau client</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {items.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Aucune notification
              </DropdownMenuItem>
            )}
            {items.slice(0, 5).map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex flex-col items-start gap-0.5 py-2.5"
              >
                <span className="text-sm font-medium">{notif.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {notif.message}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/parametres")}>
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
