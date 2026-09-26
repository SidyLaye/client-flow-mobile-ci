import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskCreatePayload } from "@/lib/api-types";

const STATUS_LABEL: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  blocked: "Bloquée",
  done: "Terminée",
  cancelled: "Annulée",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function TasksList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskCreatePayload>({
    title: "",
    description: "",
    priority: "normal",
    status: "todo",
    due_date: today(),
  });

  const query = useQuery({
    queryKey: ["tasks", { search, status: statusFilter }],
    queryFn: () =>
      api.tasks.list({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    retry: false,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", { all: true }],
    queryFn: () => api.clients.list({}),
    retry: false,
  });

  const createMutation = useMutation<Task, ApiError, TaskCreatePayload>({
    mutationFn: (payload) => api.tasks.create(payload),
    onSuccess: () => {
      toast.success("Tâche créée");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      setForm({ title: "", description: "", priority: "normal", status: "todo", due_date: today() });
    },
    onError: (err) => toast.error("Création impossible", { description: err.message }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: () => {
      toast.success("Tâche terminée");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: ApiError) => toast.error("Erreur", { description: err.message }),
  });

  const items = useMemo(() => query.data?.results ?? [], [query.data]);

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {query.data ? `${query.data.count} tâche(s)` : "—"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client</Label>
                  <Select
                    value={form.client ?? "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, client: v === "none" ? null : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {clientsQuery.data?.results.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name || `${c.first_name} ${c.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, priority: v as TaskCreatePayload["priority"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Date d'échéance</Label>
                <Input
                  type="date"
                  value={form.due_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={!form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Titre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Échéance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            )}
            {!query.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune tâche.
                </td>
              </tr>
            )}
            {items.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.client_name || "—"}</td>
                <td className="px-4 py-3">{PRIORITY_LABEL[t.priority] ?? t.priority}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.due_date ?? "—"}</td>
                <td className="px-4 py-3">{STATUS_LABEL[t.status] ?? t.status}</td>
                <td className="px-4 py-3 text-right">
                  {t.status !== "done" && t.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeMutation.mutate(t.id)}
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                      Terminer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
