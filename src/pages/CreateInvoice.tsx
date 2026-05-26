import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import type { Invoice, InvoiceCreatePayload } from "@/lib/api-types";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
}

const newLine = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit: "unit",
  unit_price_ht: 0,
  vat_rate: 20,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: ["clients", { all: true }],
    queryFn: () => api.clients.list({}),
    retry: false,
  });

  const clientsList = Array.isArray(clientsQuery.data)
    ? clientsQuery.data
    : (clientsQuery.data?.results ?? []);

  const [client, setClient] = useState<string>("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  const totals = useMemo(() => {
    let ht = 0;
    let vat = 0;
    for (const l of lines) {
      const lineHt = l.quantity * l.unit_price_ht;
      ht += lineHt;
      vat += lineHt * (l.vat_rate / 100);
    }
    return { ht, vat, ttc: ht + vat };
  }, [lines]);

  const mutation = useMutation<Invoice, ApiError, InvoiceCreatePayload>({
    mutationFn: (payload) => api.invoices.create(payload),
    onSuccess: (created) => {
      toast.success("Facture creee");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate("/factures/" + created.id);
    },
    onError: (err) => toast.error("Creation impossible", { description: err.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      toast.error("Selectionnez un client.");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      toast.error("Toutes les lignes doivent avoir une description.");
      return;
    }
    mutation.mutate({
      client,
      issue_date: issueDate,
      due_date: dueDate,
      notes,
      terms,
      lines: lines.map((l, idx) => ({
        position: idx + 1,
        description: l.description,
        quantity: String(l.quantity),
        unit: l.unit,
        unit_price_ht: String(l.unit_price_ht),
        vat_rate: String(l.vat_rate),
      })) as InvoiceCreatePayload["lines"],
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nouvelle facture</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Le numero de facture est genere a la validation
</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client &amp; dates</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <Label>Client *</Label>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger>
                  <SelectValue placeholder={clientsQuery.isLoading ? "Chargement..." : "Selectionner un client"} />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.company_name || c.first_name + " " + c.last_name) + " · " + c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d&apos;emission *</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div>
              <Label>Date d&apos;echeance *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lignes</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter une ligne
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l) => (
              <div key={l.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Label className="text-xs">Description</Label>
                  <Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} required />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <Label className="text-xs">Qte</Label>
                  <Input type="number" step="0.001" value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs">Unite</Label>
                  <Input value={l.unit} onChange={(e) => updateLine(l.id, { unit: e.target.value })} />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs">PU HT</Label>
                  <Input type="number" step="0.01" value={l.unit_price_ht} onChange={(e) => updateLine(l.id, { unit_price_ht: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-xs">TVA %</Label>
                  <Input type="number" step="0.1" value={l.vat_rate} onChange={(e) => updateLine(l.id, { vat_rate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(l.id)} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes &amp; conditions</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div><Label>Conditions de reglement</Label><Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{fmt(totals.ht)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{fmt(totals.vat)}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold text-base"><span>Total TTC</span><span>{fmt(totals.ttc)}</span></div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Creer la facture
          </Button>
        </div>
      </form>
    </div>
  );
}
