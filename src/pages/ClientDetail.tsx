import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";

const fmt = (value: string | number | null | undefined) => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(n) ? n : 0,
  );
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const clientQuery = useQuery({
    queryKey: ["clients", id],
    queryFn: () => api.clients.retrieve(id!),
    enabled: Boolean(id),
    retry: false,
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices", { client: id }],
    queryFn: () => api.invoices.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const quotesQuery = useQuery({
    queryKey: ["quotes", { client: id }],
    queryFn: () => api.quotes.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const documentsQuery = useQuery({
    queryKey: ["documents", { client: id }],
    queryFn: () => api.documents.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const requestsQuery = useQuery({
    queryKey: ["document-requests", { client: id }],
    queryFn: () => api.documentRequests.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", { client: id }],
    queryFn: () => api.messages.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", { client: id }],
    queryFn: () => api.tasks.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });
  const deadlinesQuery = useQuery({
    queryKey: ["deadlines", { client: id }],
    queryFn: () => api.deadlines.list({ client: id! }),
    enabled: Boolean(id),
    retry: false,
  });

  const invoices = useMemo(() => invoicesQuery.data?.results ?? [], [invoicesQuery.data]);
  const quotes = useMemo(() => quotesQuery.data?.results ?? [], [quotesQuery.data]);
  const documents = useMemo(() => documentsQuery.data?.results ?? [], [documentsQuery.data]);
  const requests = useMemo(() => requestsQuery.data?.results ?? [], [requestsQuery.data]);
  const messages = useMemo(() => messagesQuery.data?.results ?? [], [messagesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data?.results ?? [], [tasksQuery.data]);
  const deadlines = useMemo(() => deadlinesQuery.data?.results ?? [], [deadlinesQuery.data]);

  if (clientQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
        </Button>
        <p className="text-sm text-destructive">
          {(clientQuery.error as ApiError | undefined)?.message ?? "Client introuvable."}
        </p>
      </div>
    );
  }

  const c = clientQuery.data;
  const fullName = `${c.first_name} ${c.last_name}`.trim();
  const headline = c.company_name || fullName || c.email;
  const totalTtc = invoices.reduce((s, i) => s + parseFloat(i.total_ttc || "0"), 0);
  const missingDocs = requests.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{headline}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fullName} · {c.email} · Statut : {c.status}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="requests">Demandes ({requests.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tâches ({tasks.length})</TabsTrigger>
          <TabsTrigger value="deadlines">Échéances ({deadlines.length})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-4 gap-4">
            <Stat icon={Receipt} label="Factures" value={String(invoices.length)} />
            <Stat icon={FileText} label="Devis" value={String(quotes.length)} />
            <Stat icon={Send} label="Demandes ouvertes" value={String(missingDocs)} />
            <Stat icon={Receipt} label="Total TTC" value={fmt(totalTtc)} />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <SimpleTable
            isLoading={documentsQuery.isLoading}
            empty="Aucun document."
            headers={["Fichier", "Catégorie", "Statut", "Période"]}
            rows={documents.map((d) => [
              d.file_name,
              d.category,
              d.status,
              d.period_year ? `${String(d.period_month ?? "").padStart(2, "0")}/${d.period_year}` : "—",
            ])}
            onRowClick={(idx) => navigate(`/documents/${documents[idx].id}`)}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <SimpleTable
            isLoading={requestsQuery.isLoading}
            empty="Aucune demande."
            headers={["Titre", "Type", "Échéance", "Statut", "Priorité"]}
            rows={requests.map((r) => [
              r.title,
              r.requested_type || "—",
              r.due_date ?? "—",
              r.status,
              r.priority,
            ])}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {messagesQuery.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message.</p>
              ) : (
                messages.slice(-10).map((m) => (
                  <div key={m.id} className="border-b last:border-0 pb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-medium">{m.sender_name || m.sender_email}</span>
                      <span>·</span>
                      <span>{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                      {m.is_internal && <span className="text-amber-600">interne</span>}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-line">{m.body}</p>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/messages")}>
                Ouvrir la messagerie
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <SimpleTable
            isLoading={tasksQuery.isLoading}
            empty="Aucune tâche."
            headers={["Titre", "Priorité", "Échéance", "Statut"]}
            rows={tasks.map((t) => [t.title, t.priority, t.due_date ?? "—", t.status])}
          />
        </TabsContent>

        <TabsContent value="deadlines" className="mt-4">
          <SimpleTable
            isLoading={deadlinesQuery.isLoading}
            empty="Aucune échéance."
            headers={["Titre", "Type", "Date", "Statut"]}
            rows={deadlines.map((d) => [d.title, d.type, d.due_date, d.status])}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SimpleTable
            isLoading={invoicesQuery.isLoading}
            empty="Aucune facture."
            headers={["Numéro", "Date", "Statut", "TTC"]}
            rows={invoices.map((i) => [i.invoice_number, i.issue_date, i.status, fmt(i.total_ttc)])}
            onRowClick={(idx) => navigate(`/factures/${invoices[idx].id}`)}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <SimpleTable
            isLoading={quotesQuery.isLoading}
            empty="Aucun devis."
            headers={["Numéro", "Date", "Statut", "TTC"]}
            rows={quotes.map((q) => [q.quote_number, q.issue_date, q.status, fmt(q.total_ttc)])}
          />
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> {c.email}
              </div>
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {c.phone}
                </div>
              )}
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {c.address_line1}
                  {c.address_line2 && <div>{c.address_line2}</div>}
                  <div>
                    {c.postal_code} {c.city} · {c.country}
                  </div>
                </div>
              </div>
              {c.siren && <div>SIREN : {c.siren}</div>}
              {c.siret && <div>SIRET : {c.siret}</div>}
              {c.vat_number && <div>TVA : {c.vat_number}</div>}
              {c.tax_regime && <div>Régime fiscal : {c.tax_regime}</div>}
              {c.vat_regime && <div>Régime TVA : {c.vat_regime}</div>}
              {c.vat_frequency && <div>Périodicité TVA : {c.vat_frequency}</div>}
              {c.fiscal_year_end && <div>Clôture : {c.fiscal_year_end}</div>}
              {c.assigned_user_email && (
                <div>Comptable : {c.assigned_user_email}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}

function SimpleTable({
  isLoading,
  empty,
  headers,
  rows,
  onRowClick,
}: {
  isLoading: boolean;
  empty: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  onRowClick?: (idx: number) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {headers.map((h) => (
                  <th key={h} className="text-left py-2 font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b last:border-0 ${onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
                  onClick={onRowClick ? () => onRowClick(idx) : undefined}
                >
                  {row.map((cell, cidx) => (
                    <td key={cidx} className="py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
