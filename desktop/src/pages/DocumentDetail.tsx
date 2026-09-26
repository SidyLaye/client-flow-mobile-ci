import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, downloadFile, fetchFileBlob } from "@/lib/api";
import type { DocumentStatus } from "@/lib/api-types";

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

function isTextMime(mime?: string): boolean {
  if (!mime) return false;
  return mime.startsWith("text/") || mime === "application/csv";
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const query = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.documents.retrieve(id!),
    enabled: Boolean(id),
    retry: false,
  });

  // Files are protected: fetch with the JWT, preview through a blob URL.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const docId = query.data?.id;
  const docMime = query.data?.mime_type ?? "";
  const hasFile = Boolean(query.data?.file_url);

  useEffect(() => {
    setPreviewUrl(null);
    setTextContent(null);
    setPreviewError(false);
    if (!docId || !hasFile) return;
    const previewable =
      docMime.startsWith("image/") || docMime === "application/pdf" || isTextMime(docMime);
    if (!previewable) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setTextLoading(true);
    fetchFileBlob(api.documents.downloadUrl(docId))
      .then(async (blob) => {
        if (cancelled) return;
        if (isTextMime(docMime)) {
          const text = await blob.text();
          if (!cancelled) setTextContent(text);
        } else {
          // Re-type the blob so the browser renders it inline.
          objectUrl = URL.createObjectURL(new Blob([blob], { type: docMime }));
          setPreviewUrl(objectUrl);
        }
      })
      .catch(() => !cancelled && setPreviewError(true))
      .finally(() => !cancelled && setTextLoading(false));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, docMime, hasFile]);

  const reviewMutation = useMutation({
    mutationFn: (decision: "validate" | "reject" | "incomplete") =>
      api.documents.review(id!, decision, comment || undefined, reason || undefined),
    onSuccess: () => {
      toast.success("Document mis à jour");
      qc.invalidateQueries({ queryKey: ["documents", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      setComment("");
      setReason("");
    },
    onError: (err: ApiError) => toast.error("Erreur", { description: err.message }),
  });

  const handleDownload = async () => {
    if (!query.data?.id) return;
    try {
      await downloadFile(
        api.documents.downloadUrl(query.data.id),
        query.data.original_file_name || query.data.file_name || "document",
      );
    } catch (e) {
      toast.error("Téléchargement impossible", { description: (e as Error).message });
    }
  };

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
        </Button>
        <p className="text-sm text-destructive">
          {(query.error as ApiError | undefined)?.message ?? "Document introuvable."}
        </p>
      </div>
    );
  }

  const doc = query.data;
  const badge = STATUS_BADGE[doc.status];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold truncate">{doc.original_file_name || doc.file_name}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {doc.client_name} &middot; {CATEGORY_LABEL[doc.category] ?? doc.category} &middot;{" "}
            {doc.period_year
              ? `${String(doc.period_month ?? "").padStart(2, "0")}/${doc.period_year}`
              : "Pas de période"}
          </p>
        </div>
        {doc.file_url && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Télécharger
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Aperçu</CardTitle>
          </CardHeader>
          <CardContent>
            {doc.file_url ? (
              previewError ? (
                <p className="text-sm text-muted-foreground">
                  Aperçu indisponible. Téléchargez le fichier pour le consulter.
                </p>
              ) : doc.mime_type?.startsWith("image/") || doc.mime_type === "application/pdf" ? (
                previewUrl ? (
                  doc.mime_type === "application/pdf" ? (
                    <iframe src={previewUrl} title={doc.file_name} className="w-full h-[600px] border rounded" />
                  ) : (
                    <img src={previewUrl} alt={doc.file_name} className="max-h-[600px] mx-auto" />
                  )
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                )
              ) : isTextMime(doc.mime_type) ? (
                textLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : textContent !== null ? (
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[600px] whitespace-pre-wrap">
                    {textContent}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Impossible de charger l&apos;aperçu texte.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Format non prévisualisable. Téléchargez le fichier pour le consulter.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Aucun fichier disponible.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {doc.client_comment && (
                <div>
                  <Label className="text-xs text-muted-foreground">Du client</Label>
                  <p className="whitespace-pre-line">{doc.client_comment}</p>
                </div>
              )}
              {doc.internal_comment && (
                <div>
                  <Label className="text-xs text-muted-foreground">Interne</Label>
                  <p className="whitespace-pre-line">{doc.internal_comment}</p>
                </div>
              )}
              <div>
                <Label>Ajouter un commentaire interne</Label>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div>
                <Label>Motif envoyé au client (si refus ou incomplet)</Label>
                <Textarea
                  rows={2}
                  value={reason}
                  maxLength={1000}
                  placeholder="Ex. : la page 2 du relevé manque"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Décision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate("validate")}
              >
                <Check className="h-4 w-4 mr-1.5" /> Valider
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate("incomplete")}
              >
                Marquer comme incomplet
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate("reject")}
              >
                <X className="h-4 w-4 mr-1.5" /> Refuser
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
