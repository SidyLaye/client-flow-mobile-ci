import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { uploadDocument } from "@/lib/client-data";

interface Props {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function UploadDocumentDialog({ clientId, clientName, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const now = new Date();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [periodMonth, setPeriodMonth] = useState<string>(String(now.getMonth() + 1));
  const [periodYear, setPeriodYear] = useState<string>(String(now.getFullYear()));
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [internalComment, setInternalComment] = useState("");

  const reset = () => {
    setFile(null);
    setCategory("");
    setPeriodMonth(String(now.getMonth() + 1));
    setPeriodYear(String(now.getFullYear()));
    setVisibleToClient(false);
    setInternalComment("");
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Aucun fichier sélectionné");
      return uploadDocument({
        client_id: clientId,
        file,
        category: category || undefined,
        period_month: periodMonth ? Number(periodMonth) : undefined,
        period_year: periodYear ? Number(periodYear) : undefined,
        visible_to_client: visibleToClient,
        internal_comment: internalComment || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document téléchargé");
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error("Échec de l'upload", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Téléverser un document</DialogTitle>
          <DialogDescription>
            Pour <span className="font-medium">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="doc-file">Fichier *</Label>
            <label
              htmlFor="doc-file"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 px-6 py-8 cursor-pointer hover:border-primary hover:bg-muted/50 transition"
            >
              <FileUp className="h-6 w-6 text-muted-foreground" />
              {file ? (
                <>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} Ko</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Cliquer ou glisser un fichier</span>
                  <span className="text-xs text-muted-foreground">PDF, image, document Office</span>
                </>
              )}
            </label>
            <input
              id="doc-file"
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_invoice">Facture d'achat</SelectItem>
                  <SelectItem value="sales_invoice">Facture de vente</SelectItem>
                  <SelectItem value="bank_statement">Relevé bancaire</SelectItem>
                  <SelectItem value="tax_document">Document fiscal</SelectItem>
                  <SelectItem value="contract">Contrat</SelectItem>
                  <SelectItem value="id_document">Pièce d'identité</SelectItem>
                  <SelectItem value="rib">RIB</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visible client</Label>
              <div className="flex h-10 items-center justify-between rounded-md border border-input px-3">
                <span className="text-sm text-muted-foreground">{visibleToClient ? "Oui" : "Non"}</span>
                <Switch checked={visibleToClient} onCheckedChange={setVisibleToClient} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-year">Année</Label>
              <Input
                id="doc-year"
                type="number"
                min={2000}
                max={2100}
                value={periodYear}
                onChange={(e) => setPeriodYear(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-comment">Commentaire interne</Label>
            <Textarea
              id="doc-comment"
              rows={2}
              placeholder="Note non visible par le client..."
              value={internalComment}
              onChange={(e) => setInternalComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !file}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Téléverser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
