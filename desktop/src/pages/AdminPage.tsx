import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Search, Shield, Users, Building2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  const [searchUser, setSearchUser] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("accountant");
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => request("/api/v1/admin-dashboard/overview/"),
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", searchUser],
    queryFn: () => request(`/api/v1/admin-dashboard/users/?search=${encodeURIComponent(searchUser)}`),
    retry: false,
  });

  const entrepreneursQuery = useQuery({
    queryKey: ["admin", "entrepreneurs"],
    queryFn: () => request("/api/v1/admin-dashboard/entrepreneurs/"),
    retry: false,
  });

  async function request(path: string) {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}${path}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("a2t.access") ?? ""}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      toast.error("Email requis");
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1/admin-dashboard/users/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("a2t.access") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newUserEmail, role: newUserRole, entrepreneur: selectedEntrepreneur || undefined }),
      });
      if (!res.ok) throw new Error("Creation failed");
      toast.success("Utilisateur cree");
      setNewUserEmail("");
      usersQuery.refetch();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    }
  };

  if (!user?.is_superuser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Acces reserve aux super-admins.</p>
      </div>
    );
  }

  const overview = overviewQuery.data ?? {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Administration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{overview.entrepreneur_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Entrepreneurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{overview.user_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Utilisateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{overview.mrr ?? 0} €</p>
            <p className="text-xs text-muted-foreground">MRR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{overview.invoice_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Factures</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Utilisateurs</TabsTrigger>
          <TabsTrigger value="entrepreneurs"><Building2 className="h-4 w-4 mr-1" /> Entrepreneurs</TabsTrigger>
          <TabsTrigger value="create"><Plus className="h-4 w-4 mr-1" /> Creer compte</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Rechercher par email..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
            <Button variant="outline" onClick={() => usersQuery.refetch()}><Search className="h-4 w-4" /></Button>
          </div>
          {usersQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          <div className="space-y-2">
            {usersQuery.data?.results?.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.first_name} {u.last_name} · Inscrit le {new Date(u.date_joined).toLocaleDateString("fr-FR")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="entrepreneurs" className="space-y-4">
          {entrepreneursQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          <div className="space-y-2">
            {entrepreneursQuery.data?.results?.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.company_name}</p>
                    <p className="text-xs text-muted-foreground">{e.siren} · {e.is_active ? "Actif" : "Inactif"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Nouvel utilisateur</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="utilisateur@exemple.com" />
              </div>
              <div>
                <Label>Role *</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="accountant">Comptable</SelectItem>
                    <SelectItem value="collaborator">Collaborateur</SelectItem>
                    <SelectItem value="read_only">Lecture seule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entrepreneur (optionnel)</Label>
                <Select value={selectedEntrepreneur} onValueChange={setSelectedEntrepreneur}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entrepreneursQuery.data?.results?.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleCreateUser}><Plus className="h-4 w-4 mr-1" /> Creer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

