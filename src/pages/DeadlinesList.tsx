import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import type { Deadline, DeadlineCreatePayload } from "@/lib/api-types";

const TYPE_LABEL: Record<string, string> = {
  vat_declaration: "Déclaration TVA",
  vat_payment: "Paiement TVA",
  corporate_tax: "Impôt sur les sociétés",
  income_tax: "Impôt sur le revenu",
  social_declaration: "Déclaration sociale",
  fiscal_balance: "Bilan / Liasse",
  urssaf: "URSSAF",
  other: "Autre",
};

const STATUS_LABEL: Record<string, string> = {
  to_prepare: "À préparer",
  awaiting_documents: "En attente de pièces",
  ready: "Prêt",
  sent: "Envoyé",
  validated: "Validé",
  overdue: "En retard",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function DeadlinesList() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeadlineCreatePayload>({
    title: "",
    type: "vat_declaration",
    client: "",
    due_date: today(),
    status: "to_prepare",
  });

  const query = useQuery({
    queryKey: ["deadlines", { status: statusFilter }],
    queryFn: () =>
      api.deadlines.list({
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    retry: false,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", { all: true }],
    queryFn: () => api.clients.list({}),
    retry: false,
  });

  const createMutation = useMutation<Deadline, ApiError, DeadlineCreatePayload>({
    mutationFn: (payload) => api.deadlines.create(payload),
    onSuccess: () => {
      toast.success("Échéance créée");
      qc.invalidateQueries({ queryKey: ["deadlines"] });
      setOpen(false);
    },
    onError: (err) => toast.error("Création impossible", { description: err.message }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.deadlines.complete(id),
    onSuccess: () => {
      toast.success("Échéance validée");
      qc.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (err: ApiError) => toast.error("Erreur", { description: err.message }),
  });

  const items = useMemo(() => query.data?.results ?? [], [query.data]);
  const todayStr = today();
  const inDays = (n: number) =>
    new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const week = inDays(7);
  const month = inDays(30);

  const overdue = items.filter((d) => d.due_date < todayStr && d.status !== "validated");
  const thisWeek = items.filter((d) => d.due_date >= todayStr && d.due_date <= week);
  const thisMonth = items.filter((d) => d.due_date > week && d.due_date <= month);
  const later = items.filter((d) => d.due_date > month);

  const Row = ({ d }: { d: Deadline }) => (
    <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{d.title}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {TYPE_LABEL[d.type] ?? d.type}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {d.client_name} · {d.due_date} · {STATUS_LABEL[d.status] ?? d.status}
        </p>
      </div>
      {d.status !== "validated" && (
        <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(d.id)}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Valider
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Échéances</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calendrier des échéances comptables
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle échéance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle échéance</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, type: v as DeadlineCreatePayload["type"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>
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
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={!form.title.trim() || !form.client || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      <Tabs defaultValue="overdue">
        <TabsList>
          <TabsTrigger value="overdue">En retard ({overdue.length})</TabsTrigger>
          <TabsTrigger value="week">Cette semaine ({thisWeek.length})</TabsTrigger>
          <TabsTrigger value="month">Ce mois ({thisMonth.length})</TabsTrigger>
          <TabsTrigger value="later">Plus tard ({later.length})</TabsTrigger>
        </TabsList>
        {query.isLoading && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-4" />
        )}
        <TabsContent value="overdue" className="space-y-2 mt-4">
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune échéance en retard.</p>
          ) : (
            overdue.map((d) => <Row key={d.id} d={d} />)
          )}
        </TabsContent>
        <TabsContent value="week" className="space-y-2 mt-4">
          {thisWeek.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </TabsContent>
        <TabsContent value="month" className="space-y-2 mt-4">
          {thisMonth.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </TabsContent>
        <TabsContent value="later" className="space-y-2 mt-4">
          {later.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
