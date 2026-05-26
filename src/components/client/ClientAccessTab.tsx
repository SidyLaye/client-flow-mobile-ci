import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, KeyRound, Ban, PlayCircle, XCircle, Edit, Eye, EyeOff, RefreshCw, Shield, Clock, Copy } from "lucide-react";
import { toast } from "sonner";

export type AccessStatus = 'active' | 'suspended' | 'disabled';

export interface ClientAccess {
  id: string;
  clientId: string;
  username: string;
  email: string;
  isPrimary: boolean;
  accessStatus: AccessStatus;
  canAccessWeb: boolean;
  canAccessMobile: boolean;
  createdBy: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  createdAt: string;
  details: string;
}

const accessStatusLabels: Record<AccessStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  disabled: 'Désactivé',
};

const accessStatusColors: Record<AccessStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  suspended: 'bg-amber-100 text-amber-800 border-amber-200',
  disabled: 'bg-red-100 text-red-800 border-red-200',
};

interface Props {
  clientId: string;
  clientEmail: string;
}

const USERNAME_REGEX = /^[a-z0-9._-]{4,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function ClientAccessTab({ clientId, clientEmail }: Props) {
  const [access, setAccess] = useState<ClientAccess | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  // Create form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(clientEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [initialStatus, setInitialStatus] = useState<'active' | 'suspended'>('active');
  const [isPrimary, setIsPrimary] = useState(true);
  const [canAccessWeb, setCanAccessWeb] = useState(true);
  const [canAccessMobile, setCanAccessMobile] = useState(false);
  const [sendByEmail, setSendByEmail] = useState(true);
  const [showAfterCreate, setShowAfterCreate] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = "L'identifiant est obligatoire";
    else if (!USERNAME_REGEX.test(username)) e.username = "4-30 car., minuscules, chiffres, . - _ uniquement";
    if (!email.trim()) e.email = "L'email est obligatoire";
    else if (!EMAIL_REGEX.test(email)) e.email = "Format email invalide";
    if (!password) e.password = "Le mot de passe est obligatoire";
    else if (password.length < PASSWORD_MIN) e.password = `Minimum ${PASSWORD_MIN} caractères`;
    else if (!/[a-zA-Z]/.test(password)) e.password = "Au moins 1 lettre requise";
    else if (!/[0-9]/.test(password)) e.password = "Au moins 1 chiffre requis";
    if (password !== confirmPassword) e.confirmPassword = "Les mots de passe ne correspondent pas";
    return e;
  }

  function handleCreate() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const now = new Date().toISOString();
    const newAccess: ClientAccess = {
      id: crypto.randomUUID(),
      clientId,
      username: username.trim().toLowerCase(),
      email: email.trim(),
      isPrimary,
      accessStatus: initialStatus,
      canAccessWeb,
      canAccessMobile,
      createdBy: 'Marie Leroy',
      createdAt: now,
      lastLoginAt: null,
    };
    setAccess(newAccess);
    addAuditEntry(`Compte client créé (identifiant: ${newAccess.username})`);
    
    if (showAfterCreate) {
      setCreatedCredentials({ username: newAccess.username, password });
      setShowCredentials(true);
    }
    if (sendByEmail) {
      toast.success("Identifiants envoyés par email au client");
    }
    toast.success("Accès client créé avec succès");
    setShowCreateDialog(false);
    resetForm();
  }

  function addAuditEntry(action: string) {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      action,
      performedBy: 'Marie Leroy',
      createdAt: new Date().toISOString(),
      details: '',
    }, ...prev]);
  }

  function resetForm() {
    setUsername('');
    setEmail(clientEmail);
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setShowPassword(false);
  }

  function handleSuspend() {
    if (!access) return;
    setAccess({ ...access, accessStatus: 'suspended' });
    addAuditEntry('Compte client suspendu');
    toast.success("Le compte client a été suspendu");
  }

  function handleReactivate() {
    if (!access) return;
    setAccess({ ...access, accessStatus: 'active' });
    addAuditEntry('Compte client réactivé');
    toast.success("Le compte client a été réactivé");
  }

  function handleDisable() {
    if (!access) return;
    setAccess({ ...access, accessStatus: 'disabled' });
    addAuditEntry('Compte client désactivé');
    toast.success("Le compte client a été désactivé");
  }

  function handleResetPassword() {
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = "Le mot de passe est obligatoire";
    else if (newPassword.length < PASSWORD_MIN) errs.newPassword = `Minimum ${PASSWORD_MIN} caractères`;
    else if (!/[a-zA-Z]/.test(newPassword)) errs.newPassword = "Au moins 1 lettre requise";
    else if (!/[0-9]/.test(newPassword)) errs.newPassword = "Au moins 1 chiffre requis";
    if (newPassword !== confirmNewPassword) errs.confirmNewPassword = "Les mots de passe ne correspondent pas";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    addAuditEntry('Mot de passe réinitialisé');
    toast.success("Mot de passe réinitialisé avec succès");
    setShowResetDialog(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setErrors({});
  }

  // No access yet
  if (!access) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-1">Aucun accès client n'existe encore</p>
            <p className="text-xs text-muted-foreground mb-6">Créez un compte pour permettre au client d'accéder à son espace.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />Créer accès client
            </Button>
          </CardContent>
        </Card>
        {renderCreateDialog()}
      </div>
    );
  }

  // Access exists
  return (
    <div className="space-y-4">
      {/* Access info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Compte client</CardTitle>
            <Badge className={`text-xs border ${accessStatusColors[access.accessStatus]}`}>
              {accessStatusLabels[access.accessStatus]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
            <div><span className="text-muted-foreground">Identifiant</span><p className="font-medium">{access.username}</p></div>
            <div><span className="text-muted-foreground">Email</span><p className="font-medium">{access.email}</p></div>
            <div><span className="text-muted-foreground">Compte principal</span><p className="font-medium">{access.isPrimary ? 'Oui' : 'Non'}</p></div>
            <div><span className="text-muted-foreground">Créé par</span><p className="font-medium">{access.createdBy}</p></div>
            <div><span className="text-muted-foreground">Date de création</span><p className="font-medium">{new Date(access.createdAt).toLocaleDateString('fr-FR')}</p></div>
            <div><span className="text-muted-foreground">Dernière connexion</span><p className="font-medium">{access.lastLoginAt ? new Date(access.lastLoginAt).toLocaleString('fr-FR') : 'Jamais'}</p></div>
            <div><span className="text-muted-foreground">Accès web</span><p className="font-medium">{access.canAccessWeb ? '✓ Autorisé' : '✕ Non autorisé'}</p></div>
            <div><span className="text-muted-foreground">Accès mobile</span><p className="font-medium">{access.canAccessMobile ? '✓ Autorisé' : '✕ Non autorisé'}</p></div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />Réinitialiser mot de passe
            </Button>
            {access.accessStatus === 'active' && (
              <Button variant="outline" size="sm" onClick={handleSuspend}>
                <Ban className="h-3.5 w-3.5 mr-1.5" />Suspendre
              </Button>
            )}
            {access.accessStatus === 'suspended' && (
              <Button variant="outline" size="sm" onClick={handleReactivate}>
                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Réactiver
              </Button>
            )}
            {access.accessStatus !== 'disabled' && (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDisable}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" />Désactiver
              </Button>
            )}
            {access.accessStatus === 'disabled' && (
              <Button variant="outline" size="sm" onClick={handleReactivate}>
                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Réactiver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />Historique des actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length > 0 ? (
            <div className="space-y-2">
              {auditLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                    {new Date(entry.createdAt).toLocaleString('fr-FR')}
                  </span>
                  <span className="text-sm">{entry.action}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{entry.performedBy}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun historique</p>
          )}
        </CardContent>
      </Card>

      {/* Credentials display dialog */}
      {showCredentials && createdCredentials && (
        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Identifiants créés</DialogTitle>
              <DialogDescription>Conservez ces informations, le mot de passe ne sera plus visible.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div><p className="text-xs text-muted-foreground">Identifiant</p><p className="font-mono font-medium">{createdCredentials.username}</p></div>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdCredentials.username); toast.success("Copié"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div><p className="text-xs text-muted-foreground">Mot de passe</p><p className="font-mono font-medium">{createdCredentials.password}</p></div>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdCredentials.password); toast.success("Copié"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowCredentials(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {renderResetDialog()}
    </div>
  );

  function renderCreateDialog() {
    return (
      <Dialog open={showCreateDialog} onOpenChange={(o) => { setShowCreateDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer accès client</DialogTitle>
            <DialogDescription>Créez un compte de connexion pour le client.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Bloc 1 — Connexion */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations de connexion</h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">Identifiant *</Label>
                <Input
                  id="username"
                  placeholder="ex: dupont.m, client001"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className={errors.username ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">Lettres minuscules, chiffres, point, tiret, underscore. 4-30 car.</p>
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@exemple.fr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe initial *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Générer automatiquement"
                    onClick={() => { const p = generatePassword(); setPassword(p); setConfirmPassword(p); setShowPassword(true); }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Min. 8 car., au moins 1 lettre et 1 chiffre</p>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe *</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Bloc 2 — Paramètres */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Paramètres du compte</h3>
              
              <div className="space-y-2">
                <Label>Statut initial</Label>
                <Select value={initialStatus} onValueChange={(v: 'active' | 'suspended') => setInitialStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="suspended">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-primary" className="cursor-pointer">Compte principal</Label>
                <Switch id="is-primary" checked={isPrimary} onCheckedChange={setIsPrimary} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="web-access" className="cursor-pointer">Autoriser connexion web</Label>
                <Switch id="web-access" checked={canAccessWeb} onCheckedChange={setCanAccessWeb} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-access" className="cursor-pointer">Autoriser connexion mobile</Label>
                <Switch id="mobile-access" checked={canAccessMobile} onCheckedChange={setCanAccessMobile} />
              </div>
            </div>

            {/* Bloc 3 — Communication */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Communication</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="send-email" className="cursor-pointer">Envoyer identifiants par email</Label>
                <Switch id="send-email" checked={sendByEmail} onCheckedChange={setSendByEmail} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-after" className="cursor-pointer">Afficher identifiants après création</Label>
                <Switch id="show-after" checked={showAfterCreate} onCheckedChange={setShowAfterCreate} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreate}>
              <UserPlus className="h-4 w-4 mr-2" />Créer le compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function renderResetDialog() {
    return (
      <Dialog open={showResetDialog} onOpenChange={(o) => { setShowResetDialog(o); if (!o) { setNewPassword(''); setConfirmNewPassword(''); setErrors({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>Définissez un nouveau mot de passe pour {access?.username}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={errors.newPassword ? 'border-destructive' : ''}
                />
                <Button variant="outline" size="icon" onClick={() => { const p = generatePassword(); setNewPassword(p); setConfirmNewPassword(p); }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input
                type="text"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                className={errors.confirmNewPassword ? 'border-destructive' : ''}
              />
              {errors.confirmNewPassword && <p className="text-xs text-destructive">{errors.confirmNewPassword}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Annuler</Button>
            <Button onClick={handleResetPassword}>Réinitialiser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
