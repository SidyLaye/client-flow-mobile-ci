import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const { user, roles, activeEntrepreneurId, setActiveEntrepreneur } = useAuth();
  const qc = useQueryClient();

  const entrepreneurQuery = useQuery({
    queryKey: ["entrepreneur", activeEntrepreneurId],
    queryFn: () => api.entrepreneurs.retrieve(activeEntrepreneurId!),
    enabled: Boolean(activeEntrepreneurId),
    retry: false,
  });

  const [companyName, setCompanyName] = useState("");
  const [siren, setSiren] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (entrepreneurQuery.data) {
      const e = entrepreneurQuery.data;
      setCompanyName(e.company_name);
      setSiren(e.siren ?? "");
      setSiret(e.siret ?? "");
      setVatNumber(e.vat_number);
      setAddress(e.address_line1);
      setPostalCode(e.postal_code);
      setCity(e.city);
    }
  }, [entrepreneurQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.entrepreneurs.update(activeEntrepreneurId!, {
        company_name: companyName,
        siren: siren || null,
        siret: siret || null,
        vat_number: vatNumber,
        address_line1: address,
        postal_code: postalCode,
        city,
      }),
    onSuccess: () => {
      toast.success("Modifications enregistrées");
      qc.invalidateQueries({ queryKey: ["entrepreneur", activeEntrepreneurId] });
    },
    onError: (err: ApiError) =>
      toast.error("Enregistrement impossible", { description: err.message }),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Compte utilisateur et entrepreneur actif</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon compte</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="font-medium">{user?.email ?? "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <p className="font-medium">
              {user ? `${user.first_name} ${user.last_name}`.trim() || "—" : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entrepreneur actif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {roles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun entrepreneur ne vous est associé.
            </p>
          )}
          {roles.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-2 border-b last:border-0 border-border"
            >
              <div>
                <p className="text-sm font-medium">{r.entrepreneur}</p>
                <p className="text-xs text-muted-foreground">Rôle : {r.role}</p>
              </div>
              <Button
                size="sm"
                variant={r.entrepreneur === activeEntrepreneurId ? "default" : "outline"}
                onClick={() => setActiveEntrepreneur(r.entrepreneur)}
              >
                {r.entrepreneur === activeEntrepreneurId ? "Actif" : "Sélectionner"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {entrepreneurQuery.isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {entrepreneurQuery.data && (
            <>
              <div className="sm:col-span-2">
                <Label>Raison sociale *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div>
                <Label>SIREN</Label>
                <Input value={siren} onChange={(e) => setSiren(e.target.value)} maxLength={9} />
              </div>
              <div>
                <Label>SIRET</Label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={14} />
              </div>
              <div>
                <Label>N° TVA</Label>
                <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button
          disabled={!entrepreneurQuery.data || updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
