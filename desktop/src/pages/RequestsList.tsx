import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Plus, Search } from "lucide-react";
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
import type { DocumentRequest, DocumentRequestCreatePayload } from "@/lib/api-types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  seen: "Vue",
  partially_completed: "Partielle",
  completed: "Complétée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function RequestsList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DocumentRequestCreatePayload>({
    client: "",
    title: "",
    description: "",
    requested_type: "",
    due_date: inDays(7),
    priority: "normal",
  });

  const query = useQuery({
    queryKey: ["document-requests", { search, status: statusFilter }],
    queryFn: () =>
      api.documentRequests.list({
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

  const createMutation = useMutation<DocumentRequest, ApiError, DocumentRequestCreatePayload>({
    mutationFn: (payload) => api.documentRequests.create(payload),
    onSuccess: () => {
      toast.success("Demande créée");
      qc.invalidateQueries({ queryKey: ["document-requests"] });
      setOpen(false);
      setForm({
        client: "",
        title: "",
        description: "",
        requested_type: "",
        due_date: inDays(7),
        priority: "normal",
      });
    },
    onError: (err) => toast.error("Création impossible", { description: err.message }),
  });

  const remindMutation = useMutation({
    mutationFn: (id: string) => api.documentRequests.remind(id),
    onSuccess: () => {
      toast.success("Relance envoyée");
      qc.invalidateQueries({ queryKey: ["document-requests"] });
    },
    onError: (err: ApiError) => toast.error("Erreur", { description: err.message }),
  });

  const items = useMemo(() => query.data?.results ?? [], [query.data]);
  const todayStr = today();

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Demandes de documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {query.data ? `${query.data.count} demande(s)` : "—"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demander un document</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Client *</Label>
                <Select
                  value={form.client}
                  onValueChange={(v) => setForm((f) => ({ ...f, client: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsQuery.data?.results.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name || `${c.first_name} ${c.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
                  <Label>Type demandé</Label>
                  <Input
                    value={form.requested_type ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, requested_type: e.target.value }))
                    }
                    placeholder="Relevé bancaire, RIB..."
                  />
                </div>
                <div>
                  <Label>Échéance</Label>
                  <Input
                    type="date"
                    value={form.due_date ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value || null }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v as DocumentRequestCreatePayload["priority"] }))
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={!form.client || !form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Envoyer
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Échéance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            )}
            {!query.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune demande.
                </td>
              </tr>
            )}
            {items.map((r) => {
              const isLate =
                r.due_date && r.due_date < todayStr && r.status !== "completed" && r.status !== "cancelled";
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.client_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.requested_type || "—"}</td>
                  <td className={`px-4 py-3 ${isLate ? "text-destructive" : "text-muted-foreground"}`}>
                    {r.due_date ?? "—"}
                  </td>
                  <td className="px-4 py-3">{PRIORITY_LABEL[r.priority] ?? r.priority}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="px-4 py-3 text-right">
                    {(r.status === "sent" || r.status === "seen" || r.status === "overdue" ||
                      r.status === "partially_completed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => remindMutation.mutate(r.id)}
                      >
                        <Bell className="h-3.5 w-3.5 mr-1.5" />
                        Relancer ({r.reminder_count})
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
