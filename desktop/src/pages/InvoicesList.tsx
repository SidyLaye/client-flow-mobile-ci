import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import type { Invoice, Quote } from "@/lib/api-types";

const fmt = (value: string | number | null | undefined) => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(n) ? n : 0,
  );
};

export default function InvoicesList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"invoices" | "quotes">("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const invoiceStatusOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "Tous statuts" },
    { value: "draft", label: "Brouillon" },
    { value: "validated", label: "Validée" },
    { value: "sent", label: "Envoyée" },
    { value: "partially_paid", label: "Partiellement payée" },
    { value: "paid", label: "Payée" },
    { value: "overdue", label: "En retard" },
    { value: "cancelled", label: "Annulée" },
  ];

  const quoteStatusOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "Tous statuts" },
    { value: "draft", label: "Brouillon" },
    { value: "sent", label: "Envoyé" },
    { value: "accepted", label: "Accepté" },
    { value: "refused", label: "Refusé" },
    { value: "expired", label: "Expiré" },
    { value: "invoiced", label: "Converti" },
  ];

  const invoicesQuery = useQuery({
    queryKey: ["invoices", { search, status: statusFilter }],
    queryFn: () =>
      api.invoices.list({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: tab === "invoices",
    retry: false,
  });

  const quotesQuery = useQuery({
    queryKey: ["quotes", { search, status: statusFilter }],
    queryFn: () =>
      api.quotes.list({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: tab === "quotes",
    retry: false,
  });

  const invoices: Invoice[] = useMemo(() => invoicesQuery.data?.results ?? [], [invoicesQuery.data]);
  const quotes: Quote[] = useMemo(() => quotesQuery.data?.results ?? [], [quotesQuery.data]);

  const totalTtc = (tab === "invoices" ? invoices : quotes).reduce(
    (s, item) => s + parseFloat(item.total_ttc || "0"),
    0,
  );
  const totalDue = invoices.reduce((s, i) => s + parseFloat(i.amount_due || "0"), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Factures &amp; Devis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === "invoices"
              ? `${invoicesQuery.data?.count ?? 0} facture(s)`
              : `${quotesQuery.data?.count ?? 0} devis`}
          </p>
        </div>
        <Button onClick={() => navigate("/factures/nouveau")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouvelle facture
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as "invoices" | "quotes"); setStatusFilter("all"); }}>
        <TabsList>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="quotes">Devis</TabsTrigger>
        </TabsList>

        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <div className="stat-card">
            <span className="text-2xl font-bold">{fmt(totalTtc)}</span>
            <span className="text-xs text-muted-foreground">Total TTC affiché</span>
          </div>
          {tab === "invoices" && (
            <div className="stat-card">
              <span className="text-2xl font-bold text-destructive">{fmt(totalDue)}</span>
              <span className="text-xs text-muted-foreground">Reste à encaisser</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro ou client..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(tab === "invoices" ? invoiceStatusOptions : quoteStatusOptions).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="invoices" className="mt-4">
          <DocumentTable
            isLoading={invoicesQuery.isLoading}
            error={invoicesQuery.error as ApiError | null}
            rows={invoices.map((i) => ({
              id: i.id,
              number: i.invoice_number,
              client: i.client_name,
              date: i.issue_date,
              due: i.due_date,
              status: i.status,
              totalTtc: i.total_ttc,
              extra: fmt(i.amount_due),
            }))}
            extraHeader="Reste dû"
            onClick={(id) => navigate(`/factures/${id}`)}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <DocumentTable
            isLoading={quotesQuery.isLoading}
            error={quotesQuery.error as ApiError | null}
            rows={quotes.map((q) => ({
              id: q.id,
              number: q.quote_number,
              client: q.client_name,
              date: q.issue_date,
              due: q.validity_date,
              status: q.status,
              totalTtc: q.total_ttc,
            }))}
            onClick={(id) => navigate(`/factures/${id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface RowData {
  id: string;
  number: string;
  client: string;
  date: string;
  due: string;
  status: string;
  totalTtc: string;
  extra?: string;
}

function DocumentTable({
  isLoading,
  error,
  rows,
  extraHeader,
  onClick,
}: {
  isLoading: boolean;
  error: ApiError | null;
  rows: RowData[];
  extraHeader?: string;
  onClick: (id: string) => void;
}) {
  if (error) {
    return (
      <div className="text-sm text-destructive py-6">
        Erreur de chargement : {error.message}
      </div>
    );
  }
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Numéro</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Échéance</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">TTC</th>
            {extraHeader && (
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">{extraHeader}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={extraHeader ? 7 : 6} className="px-4 py-12 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={extraHeader ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">
                Aucun document.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
              onClick={() => onClick(r.id)}
            >
              <td className="px-4 py-3 font-medium">{r.number}</td>
              <td className="px-4 py-3">{r.client}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.due}</td>
              <td className="px-4 py-3">{r.status}</td>
              <td className="px-4 py-3 text-right font-medium">{fmt(r.totalTtc)}</td>
              {extraHeader && (
                <td className="px-4 py-3 text-right font-medium text-destructive">{r.extra}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
