import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2, CheckCircle2, Eye, EyeOff, Loader2, LogIn, Mail, ShieldCheck, Sparkles, UserPlus,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const signInSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const signUpSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis").max(60),
    lastName: z.string().min(1, "Nom requis").max(60),
    email: z.string().email("Email invalide"),
    phone: z.string().optional()
      .refine((v) => !v || /^[+\d\s().-]{6,20}$/.test(v), "Numéro de téléphone invalide"),
    password: z.string()
      .min(8, "Au moins 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    passwordConfirm: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions" }) }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Les mots de passe ne correspondent pas",
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function humanize(message: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("no active account") || m.includes("invalid") || m.includes("incorrect"))
    return "Email ou mot de passe incorrect.";
  if (m.includes("already exists") || m.includes("already in use") || m.includes("user with this email"))
    return "Un compte existe déjà avec cet email. Connectez-vous plutôt.";
  if (m.includes("network") || m.includes("fetch") || m.includes("connection refused"))
    return "Connexion impossible au serveur Django (vérifiez qu'il tourne sur http://localhost:8000).";
  return message || "Une erreur est survenue. Veuillez réessayer.";
}

function passwordStrength(p: string): { score: number; label: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (p.length >= 12) s++;
  const labels = ["Très faible", "Faible", "Correct", "Bon", "Fort", "Très fort"];
  return { score: Math.min(s, 5), label: labels[Math.min(s, 5)] };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [showSignUpPw, setShowSignUpPw] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      password: "", passwordConfirm: "",
      acceptTerms: false as unknown as true,
    },
    mode: "onBlur",
  });

  const watchedPassword = signUpForm.watch("password") || "";
  const strength = useMemo(() => passwordStrength(watchedPassword), [watchedPassword]);

  const onSignIn = async (values: SignInValues) => {
    setSubmitError(null);
    const { error } = await signIn(values.email.trim(), values.password);
    if (error) { setSubmitError(humanize(error.message)); return; }
    toast.success("Connexion réussie", { description: "Bienvenue sur ComptaFlow." });
    navigate("/", { replace: true });
  };

  const onSignUp = async (values: SignUpValues) => {
    setSubmitError(null);
    const { error } = await signUp({
      email: values.email.trim(),
      password: values.password,
      password_confirm: values.passwordConfirm,
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      phone: values.phone?.trim(),
    });
    if (error) { setSubmitError(humanize(error.message)); return; }
    toast.success("Compte créé", { description: "Bienvenue sur ComptaFlow." });
    navigate("/", { replace: true });
  };

  const submittingSignIn = signInForm.formState.isSubmitting;
  const submittingSignUp = signUpForm.formState.isSubmitting;

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_0.95fr] bg-background">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">ComptaFlow</div>
            <div className="text-[11px] text-muted-foreground">Cabinet comptable</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {tab === "signin" ? "Connectez-vous à votre espace" : "Créez votre compte"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "signin"
                ? "Pilotez votre cabinet, vos clients et votre facturation."
                : "Lancez votre cabinet sur ComptaFlow en quelques secondes."}
            </p>

            <Tabs
              value={tab}
              onValueChange={(v) => { setSubmitError(null); setTab(v as "signin" | "signup"); }}
              className="mt-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Créer un compte</TabsTrigger>
              </TabsList>

              {submitError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email" type="email" placeholder="vous@cabinet.fr"
                      autoComplete="email" autoFocus disabled={submittingSignIn}
                      {...signInForm.register("email")}
                    />
                    {signInForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPw ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pr-10"
                        disabled={submittingSignIn}
                        {...signInForm.register("password")}
                      />
                      <button type="button" tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignInPw((s) => !s)}
                      >
                        {showSignInPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signInForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signInForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submittingSignIn}>
                    {submittingSignIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Se connecter
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Pas encore de compte ?{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => setTab("signup")}>
                      Inscrivez-vous
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4" noValidate>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">Prénom</Label>
                      <Input id="signup-firstName" autoComplete="given-name" disabled={submittingSignUp} {...signUpForm.register("firstName")} />
                      {signUpForm.formState.errors.firstName && (
                        <p className="text-xs text-destructive">{signUpForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Nom</Label>
                      <Input id="signup-lastName" autoComplete="family-name" disabled={submittingSignUp} {...signUpForm.register("lastName")} />
                      {signUpForm.formState.errors.lastName && (
                        <p className="text-xs text-destructive">{signUpForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email professionnel</Label>
                    <Input id="signup-email" type="email" placeholder="vous@cabinet.fr" autoComplete="email" disabled={submittingSignUp} {...signUpForm.register("email")} />
                    {signUpForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Téléphone <span className="text-muted-foreground">(optionnel)</span></Label>
                    <Input id="signup-phone" type="tel" placeholder="+33 6 12 34 56 78" autoComplete="tel" disabled={submittingSignUp} {...signUpForm.register("phone")} />
                    {signUpForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Input id="signup-password" type={showSignUpPw ? "text" : "password"} autoComplete="new-password" className="pr-10" disabled={submittingSignUp} {...signUpForm.register("password")} />
                      <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignUpPw((s) => !s)}>
                        {showSignUpPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {watchedPassword && (
                      <div className="space-y-1">
                        <div className="flex h-1 gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className={cn(
                              "flex-1 rounded-full transition-colors",
                              i < strength.score
                                ? strength.score <= 2 ? "bg-destructive"
                                  : strength.score === 3 ? "bg-amber-500" : "bg-emerald-500"
                                : "bg-muted",
                            )} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Force : {strength.label}</p>
                      </div>
                    )}
                    {signUpForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-passwordConfirm">Confirmer le mot de passe</Label>
                    <Input id="signup-passwordConfirm" type={showSignUpPw ? "text" : "password"} autoComplete="new-password" disabled={submittingSignUp} {...signUpForm.register("passwordConfirm")} />
                    {signUpForm.formState.errors.passwordConfirm && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.passwordConfirm.message}</p>
                    )}
                  </div>

                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input accent-primary" disabled={submittingSignUp} {...signUpForm.register("acceptTerms")} />
                    <span>
                      J'accepte les <a className="text-primary underline" href="#">conditions générales</a>{" "}
                      et la <a className="text-primary underline" href="#">politique de confidentialité</a>.
                    </span>
                  </label>
                  {signUpForm.formState.errors.acceptTerms && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.acceptTerms.message as string}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={submittingSignUp}>
                    {submittingSignUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Créer mon compte
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Déjà un compte ?{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => setTab("signin")}>
                      Connectez-vous
                    </button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-8" />
            <p className="text-center text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} ComptaFlow · Cabinet comptable · Backend Django
            </p>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[hsl(217_71%_38%)] text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,white_0,transparent_30%),radial-gradient(circle_at_80%_70%,white_0,transparent_25%)]" />
        <div className="relative m-auto max-w-md px-10 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Suite cabinet
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
            Le back-office moderne pour les cabinets comptables.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Centralisez vos clients, vos documents et votre facturation.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><ShieldCheck className="h-4 w-4" /></span>
              <span className="text-white/90">Sécurité bancaire, conformité RGPD</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><Mail className="h-4 w-4" /></span>
              <span className="text-white/90">Espace client mobile pour collecter pièces et messages</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><CheckCircle2 className="h-4 w-4" /></span>
              <span className="text-white/90">Échéances fiscales, TVA, bilans</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
