import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import type { Client, ClientCreatePayload } from "@/lib/api-types";

const empty: ClientCreatePayload = {
  company_name: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  siren: "",
  vat_number: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "FR",
};

export default function CreateClient() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ClientCreatePayload>(empty);

  const update =
    (field: keyof ClientCreatePayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation<Client, ApiError, ClientCreatePayload>({
    mutationFn: (payload) => api.clients.create(payload),
    onSuccess: (created) => {
      toast.success("Client créé avec succès");
      qc.invalidateQueries({ queryKey: ["clients"] });
      navigate(`/clients/${created.id}`);
    },
    onError: (err) => toast.error("Création impossible", { description: err.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nouveau client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Créer un nouveau client facturable
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nom de l'entreprise</Label>
              <Input
                placeholder="SARL Exemple (laisser vide pour particulier)"
                value={form.company_name}
                onChange={update("company_name")}
              />
            </div>
            <div>
              <Label>Prénom *</Label>
              <Input value={form.first_name} onChange={update("first_name")} required />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.last_name} onChange={update("last_name")} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={update("email")} required />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={update("phone")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations juridiques</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>SIREN</Label>
              <Input value={form.siren} onChange={update("siren")} maxLength={9} />
            </div>
            <div>
              <Label>N° TVA intracommunautaire</Label>
              <Input value={form.vat_number} onChange={update("vat_number")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Adresse *</Label>
              <Input value={form.address_line1} onChange={update("address_line1")} required />
            </div>
            <div className="sm:col-span-2">
              <Label>Complément d'adresse</Label>
              <Input value={form.address_line2} onChange={update("address_line2")} />
            </div>
            <div>
              <Label>Code postal *</Label>
              <Input value={form.postal_code} onChange={update("postal_code")} required />
            </div>
            <div>
              <Label>Ville *</Label>
              <Input value={form.city} onChange={update("city")} required />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.country} onChange={update("country")} maxLength={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Créer le client
          </Button>
        </div>
      </form>
    </div>
  );
}
