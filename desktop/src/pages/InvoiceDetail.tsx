import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api";

const fmt = (value: string | number | null | undefined) => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(n) ? n : 0,
  );
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validée",
  sent: "Envoyée",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => api.invoices.retrieve(id!),
    enabled: Boolean(id),
    retry: false,
  });

  const validateMutation = useMutation({
    mutationFn: () => api.invoices.validate(id!),
    onSuccess: () => {
      toast.success("Facture validée");
      qc.invalidateQueries({ queryKey: ["invoices", id] });
    },
    onError: (err: ApiError) =>
      toast.error("Validation impossible", { description: err.message }),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.invoices.send(id!),
    onSuccess: () => {
      toast.success("Facture envoyée par email");
      qc.invalidateQueries({ queryKey: ["invoices", id] });
    },
    onError: (err: ApiError) => toast.error("Envoi impossible", { description: err.message }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/factures")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
        </Button>
        <p className="text-sm text-destructive">
          {(query.error as ApiError | undefined)?.message ?? "Facture introuvable."}
        </p>
      </div>
    );
  }

  const inv = query.data;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/factures")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{inv.invoice_number}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {STATUS_LABELS[inv.status] ?? inv.status}
            </span>
            {inv.is_locked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">
                Verrouillée
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {inv.client_name} · Émise le {inv.issue_date} · Échéance {inv.due_date}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!inv.is_locked && (
          <Button
            variant="outline"
            size="sm"
            disabled={validateMutation.isPending}
            onClick={() => validateMutation.mutate()}
          >
            {validateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Valider
          </Button>
        )}
        {inv.is_locked && inv.status !== "paid" && (
          <Button
            variant="outline"
            size="sm"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Envoyer
          </Button>
        )}
        {inv.pdf_file && (
          <a href={api.invoices.pdfUrl(inv.id)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
          </a>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lignes de facture</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Qté</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">PU HT</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">TVA</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2 text-right">{l.quantity}</td>
                    <td className="py-2 text-right">{fmt(l.unit_price_ht)}</td>
                    <td className="py-2 text-right">{l.vat_rate}%</td>
                    <td className="py-2 text-right">{fmt(l.total_ht)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total HT" value={fmt(inv.total_ht)} />
            <Row label="TVA" value={fmt(inv.total_vat)} />
            <Separator className="my-2" />
            <Row label="Total TTC" value={fmt(inv.total_ttc)} bold />
            <Separator className="my-2" />
            <Row label="Encaissé" value={fmt(inv.amount_paid)} />
            <Row label="Reste dû" value={fmt(inv.amount_due)} bold className="text-destructive" />
          </CardContent>
        </Card>
      </div>

      {inv.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line">{inv.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
