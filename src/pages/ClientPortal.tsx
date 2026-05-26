import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, Upload, Loader2, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

export default function ClientPortal() {
  const [message, setMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["client", "documents"],
    queryFn: () => api.documents.list({ status: "", category: "", page: 1 }),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: ["client", "messages"],
    queryFn: () => api.messages.list({ is_internal: false, page: 1 }),
    retry: false,
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    try {
      await api.messages.create({ content: message, is_internal: false });
      toast.success("Message envoye");
      setMessage("");
      messagesQuery.refetch();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("file_name", uploadFile.name);
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1/documents/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("a2t.access") ?? ""}`,
          "X-Entrepreneur-Id": localStorage.getItem("a2t.entrepreneur_id") ?? "",
        },
        body: fd,
      });
      toast.success("Document depose");
      setUploadFile(null);
      documentsQuery.refetch();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Espace Client</h1>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" /> Mes documents</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1" /> Messages</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" /> Deposer</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {documentsQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          <div className="space-y-2">
            {documentsQuery.data?.results?.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.status} · {doc.category}</p>
                  </div>
                  {doc.file_url && (
                    <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, "_blank")}>
                      <Paperclip className="h-3.5 w-3.5 mr-1" /> Voir
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {!documentsQuery.isLoading && !documentsQuery.data?.results?.length && (
              <p className="text-sm text-muted-foreground">Aucun document.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="space-y-3">
            {messagesQuery.data?.results?.map((msg: any) => (
              <Card key={msg.id} className={msg.is_internal ? "opacity-60" : ""}>
                <CardContent className="py-2">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.sender_name} · {new Date(msg.created_at).toLocaleString("fr-FR")}
                  </p>
                </CardContent>
              </Card>
            ))}
            {!messagesQuery.isLoading && !messagesQuery.data?.results?.length && (
              <p className="text-sm text-muted-foreground">Aucun message.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Ecrire un message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <Button onClick={handleSendMessage}><Send className="h-4 w-4" /></Button>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Deposer un document</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button onClick={handleUpload} disabled={!uploadFile}>
                <Upload className="h-4 w-4 mr-1" /> Envoyer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

