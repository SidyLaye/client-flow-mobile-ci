import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FileText,
  Loader2,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BackendNotice } from "@/components/BackendNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api-types";

const fmt = (value: string | number | undefined | null) => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
};

export default function Dashboard() {
  const navigate = useNavigate();

  const summaryQuery = useQuery<DashboardSummary, ApiError>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api.dashboard.summary(),
    retry: false,
  });

  const overdueQuery = useQuery({
    queryKey: ["dashboard", "overdue"],
    queryFn: () => api.dashboard.overdueInvoices(),
    retry: false,
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <BackendNotice title="Backend indisponible">
          Impossible de charger le tableau de bord ({summaryQuery.error.message}). Vérifiez que
          l'API Django est démarrée et qu'un entrepreneur actif est sélectionné.
        </BackendNotice>
      </div>
    );
  }

  const s = summaryQuery.data;

  const stats = [
    { label: "Revenu YTD", value: fmt(s?.revenue.year_to_date), icon: TrendingUp, color: "text-success" },
    { label: "Revenu MTD", value: fmt(s?.revenue.month_to_date), icon: TrendingUp, color: "text-primary" },
    { label: "Dépenses YTD", value: fmt(s?.expenses.year_to_date), icon: Receipt, color: "text-warning" },
    { label: "Profit YTD", value: fmt(s?.profit_ytd), icon: TrendingUp, color: "text-success" },
    { label: "Solde bancaire", value: fmt(s?.bank_balance), icon: Banknote, color: "text-primary" },
    {
      label: `Factures en retard (${s?.overdue_invoices.count ?? 0})`,
      value: fmt(s?.overdue_invoices.total_amount),
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-destructive" />
                Factures en retard
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/factures")}>
                Voir tout <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueQuery.isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {overdueQuery.data && overdueQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Aucune facture en retard 🎉</p>
            )}
            {overdueQuery.data?.slice(0, 6).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 border-b last:border-0 border-border cursor-pointer"
                onClick={() => navigate(`/factures/${inv.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {inv.invoice_number} · {inv.client_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Échéance {inv.due_date}</p>
                </div>
                <span className="text-sm font-semibold text-destructive shrink-0">
                  {fmt(inv.amount_due)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Encaissements en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Factures à encaisser</span>
                <span className="font-semibold">
                  {fmt(s?.outstanding_invoices.total_amount)}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({s?.outstanding_invoices.count ?? 0})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Devis en cours</span>
                <span className="font-semibold">
                  {fmt(s?.pending_quotes.total_amount)}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({s?.pending_quotes.count ?? 0})
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
