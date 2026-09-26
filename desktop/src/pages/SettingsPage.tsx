import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAutostartEnabled,
  isTauri,
  setAutostart,
  testSystemNotification,
} from "@/hooks/use-desktop-notifications";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const { user, roles, activeEntrepreneurId, setActiveEntrepreneur } = useAuth();
  const qc = useQueryClient();

  const [autostart, setAutostartState] = useState<boolean | null>(null);
  useEffect(() => {
    if (isTauri) isAutostartEnabled().then(setAutostartState).catch(() => setAutostartState(null));
  }, []);
  const onToggleAutostart = async (on: boolean) => {
    try {
      await setAutostart(on);
      setAutostartState(on);
    } catch (e) {
      toast.error("Réglage impossible", { description: String(e) });
    }
  };

  const onTestNotification = async () => {
    const result = await testSystemNotification();
    if (result === "ok") {
      toast.success("Notification envoyée", {
        description:
          "Rien ne s'affiche ? Vérifiez Paramètres Windows → Système → Notifications (ComptaFlow activé, « Ne pas déranger » désactivé).",
      });
    } else if (result === "browser") {
      toast.error("Disponible seulement dans l'application installée, pas dans le navigateur.");
    } else if (result === "denied") {
      toast.error("Notifications refusées", {
        description: "Activez-les pour ComptaFlow dans Paramètres Windows → Système → Notifications.",
      });
    } else {
      toast.error("Erreur de notification", { description: result });
    }
  };

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
          <CardTitle className="text-base">Notifications Windows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Les nouvelles notifications s'affichent dans Windows (vérification toutes les 60 secondes).
            Fermer la fenêtre ne quitte pas ComptaFlow : l'application reste près de l'horloge et
            continue de vous prévenir. Pour la quitter vraiment : clic droit sur son icône →
            « Quitter ComptaFlow ».
          </p>
          {autostart !== null && (
            <div className="flex items-center gap-3">
              <Switch id="autostart" checked={autostart} onCheckedChange={onToggleAutostart} />
              <Label htmlFor="autostart">Lancer ComptaFlow au démarrage de Windows</Label>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onTestNotification}>
            <Bell className="h-4 w-4 mr-1.5" />
            Tester les notifications
          </Button>
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
