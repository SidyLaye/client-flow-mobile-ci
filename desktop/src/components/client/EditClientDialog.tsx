import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateClient, type ClientRow } from "@/lib/client-data";

interface Props {
  client: ClientRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_name: client.company_name ?? "",
    first_name: client.first_name ?? "",
    last_name: client.last_name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address_line1: client.address_line1 ?? "",
    address_line2: client.address_line2 ?? "",
    postal_code: client.postal_code ?? "",
    city: client.city ?? "",
    siren: client.siren ?? "",
    siret: client.siret ?? "",
    vat_number: client.vat_number ?? "",
    vat_regime: client.vat_regime ?? "",
    vat_frequency: client.vat_frequency ?? "",
    tax_regime: client.tax_regime ?? "",
    legal_form: client.legal_form ?? "",
    business_activity: client.business_activity ?? "",
    fiscal_year_end: client.fiscal_year_end ?? "",
    status: client.status,
  });

  useEffect(() => {
    if (open) {
      setForm({
        company_name: client.company_name ?? "",
        first_name: client.first_name ?? "",
        last_name: client.last_name ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        address_line1: client.address_line1 ?? "",
        address_line2: client.address_line2 ?? "",
        postal_code: client.postal_code ?? "",
        city: client.city ?? "",
        siren: client.siren ?? "",
        siret: client.siret ?? "",
        vat_number: client.vat_number ?? "",
        vat_regime: client.vat_regime ?? "",
        vat_frequency: client.vat_frequency ?? "",
        tax_regime: client.tax_regime ?? "",
        legal_form: client.legal_form ?? "",
        business_activity: client.business_activity ?? "",
        fiscal_year_end: client.fiscal_year_end ?? "",
        status: client.status,
      });
    }
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(form)) {
        cleaned[k] = v === "" ? null : v;
      }
      return updateClient(client.id, cleaned as typeof form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Informations enregistrées");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error("Échec", { description: err.message }),
  });

  const setField = (k: keyof typeof form) => (v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier les informations</DialogTitle>
          <DialogDescription>{client.company_name}</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Raison sociale *</Label>
            <Input value={form.company_name} onChange={(e) => setField("company_name")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Prénom contact</Label>
            <Input value={form.first_name} onChange={(e) => setField("first_name")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nom contact</Label>
            <Input value={form.last_name} onChange={(e) => setField("last_name")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setField("phone")(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Adresse</Label>
            <Input value={form.address_line1} onChange={(e) => setField("address_line1")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Complément adresse</Label>
            <Input value={form.address_line2} onChange={(e) => setField("address_line2")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Code postal</Label>
            <Input value={form.postal_code} onChange={(e) => setField("postal_code")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ville</Label>
            <Input value={form.city} onChange={(e) => setField("city")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>SIREN</Label>
            <Input value={form.siren} onChange={(e) => setField("siren")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>SIRET</Label>
            <Input value={form.siret} onChange={(e) => setField("siret")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>N° TVA</Label>
            <Input value={form.vat_number} onChange={(e) => setField("vat_number")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Forme juridique</Label>
            <Input value={form.legal_form} onChange={(e) => setField("legal_form")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Régime TVA</Label>
            <Select value={form.vat_regime} onValueChange={setField("vat_regime")}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reel_normal">Réel normal</SelectItem>
                <SelectItem value="reel_simplifie">Réel simplifié</SelectItem>
                <SelectItem value="franchise">Franchise en base</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Périodicité TVA</Label>
            <Select value={form.vat_frequency} onValueChange={setField("vat_frequency")}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="quarterly">Trimestrielle</SelectItem>
                <SelectItem value="yearly">Annuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Régime fiscal</Label>
            <Select value={form.tax_regime} onValueChange={setField("tax_regime")}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reel_normal">Réel normal</SelectItem>
                <SelectItem value="reel_simplifie">Réel simplifié</SelectItem>
                <SelectItem value="micro">Micro</SelectItem>
                <SelectItem value="franchise">Franchise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Activité</Label>
            <Input value={form.business_activity} onChange={(e) => setField("business_activity")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date de clôture exercice</Label>
            <Input type="date" value={form.fiscal_year_end} onChange={(e) => setField("fiscal_year_end")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={setField("status")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="in_creation">En création</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="closed">Clôturé</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.company_name.trim()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
