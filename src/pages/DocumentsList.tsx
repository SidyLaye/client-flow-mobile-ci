import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Eye, Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { api, ApiError } from "@/lib/api";
import type { DocumentItem, DocumentStatus } from "@/lib/api-types";

const STATUS_BADGE: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  received: { label: "Reçu", variant: "secondary" },
  under_review: { label: "En revue", variant: "outline" },
  validated: { label: "Validé", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
  incomplete: { label: "Incomplet", variant: "outline" },
  archived: { label: "Archivé", variant: "secondary" },
};

const CATEGORY_LABEL: Record<string, string> = {
  bank_statement: "Relevé bancaire",
  purchase_invoice: "Facture achat",
  sales_invoice: "Facture vente",
  contract: "Contrat",
  id_document: "Pièce d'identité",
  rib: "RIB",
  tax_document: "Document fiscal",
  other: "Autre",
};

export default function DocumentsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<string>("");
  const [category, setCategory] = useState<string>("other");
  const [periodMonth, setPeriodMonth] = useState<string>("");
  const [periodYear, setPeriodYear] = useState<string>(String(new Date().getFullYear()));
  const fileRef = useRef<HTMLInputElement | null>(null);

  const query = useQuery({
    queryKey: ["documents", { search, status: statusFilter }],
    queryFn: () =>
      api.documents.list({
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

  const uploadMutation = useMutation({
    mutationFn: () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Aucun fichier sélectionné");
      return api.documents.upload({
        file,
        client,
        category,
        period_month: periodMonth ? Number(periodMonth) : undefined,
        period_year: periodYear ? Number(periodYear) : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Document importé");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
    },
    onError: (err: ApiError | Error) =>
      toast.error("Import impossible", { description: err.message }),
  });

  const items = useMemo<DocumentItem[]>(() => query.data?.results ?? [], [query.data]);

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {query.data ? `${query.data.count} document(s)` : "—"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-1.5" />
              Importer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importer un document</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Client *</Label>
                <Select value={client} onValueChange={setClient}>
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mois</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Année</Label>
                  <Input
                    type="number"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Fichier *</Label>
                <Input ref={fileRef} type="file" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={!client || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                Importer
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
            {Object.entries(STATUS_BADGE).map(([v, c]) => (
              <SelectItem key={v} value={v}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fichier</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                Catégorie
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                Période
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
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
                  Aucun document.
                </td>
              </tr>
            )}
            {items.map((doc) => (
              <tr
                key={doc.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <td className="px-4 py-3 font-medium">{doc.file_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{doc.client_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {CATEGORY_LABEL[doc.category] ?? doc.category}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {doc.period_year
                    ? `${String(doc.period_month ?? "").padStart(2, "0")}/${doc.period_year}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[doc.status].variant}>
                    {STATUS_BADGE[doc.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
