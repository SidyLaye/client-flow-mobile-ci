import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, MessageSquare, Paperclip, Send, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, openFile } from "@/lib/api";

/**
 * Web version of the client's space. Uses the same /client-portal/ API as the
 * mobile app, so a client only ever sees its own documents and conversation.
 */
export default function ClientPortal() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["client-portal", "documents"],
    queryFn: () => api.clientPortal.documents(),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: ["client-portal", "messages"],
    queryFn: () => api.clientPortal.messages(),
    retry: false,
    refetchInterval: 20_000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.clientPortal.sendMessage(body),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["client-portal", "messages"] });
    },
    onError: (e: Error) => toast.error("Envoi impossible", { description: e.message }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.clientPortal.upload(file),
    onSuccess: () => {
      toast.success("Document envoyé à votre cabinet");
      setUploadFile(null);
      qc.invalidateQueries({ queryKey: ["client-portal", "documents"] });
    },
    onError: (e: Error) => toast.error("Envoi impossible", { description: e.message }),
  });

  const loadError = documentsQuery.error ?? messagesQuery.error;
  // Oldest first in the thread.
  const thread = [...(messagesQuery.data?.results ?? [])].reverse();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Espace client</h1>
      </div>

      {loadError && (
        <p className="text-sm text-destructive">
          Cet espace est réservé aux comptes clients ({(loadError as Error).message}).
        </p>
      )}

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1" /> Mes documents
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-1" /> Messages
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-1" /> Déposer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-2">
          {documentsQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {documentsQuery.data?.results.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{doc.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.status_label} · {doc.category_label}
                  </p>
                </div>
                {doc.download_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openFile(doc.download_url!).catch((e: Error) =>
                        toast.error("Ouverture impossible", { description: e.message }),
                      )
                    }
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1" /> Voir
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!documentsQuery.isLoading && !documentsQuery.data?.results.length && (
            <p className="text-sm text-muted-foreground">Aucun document.</p>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="space-y-3">
            {thread.map((msg) => (
              <Card key={msg.id} className={msg.is_mine ? "ml-12 bg-primary/5" : "mr-12"}>
                <CardContent className="py-2">
                  <p className="text-sm whitespace-pre-line">{msg.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.sender_name} · {new Date(msg.created_at).toLocaleString("fr-FR")}
                  </p>
                </CardContent>
              </Card>
            ))}
            {!messagesQuery.isLoading && thread.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun message.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Écrire un message…"
              value={message}
              maxLength={5000}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <Button
              onClick={() => message.trim() && sendMutation.mutate(message.trim())}
              disabled={!message.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Déposer un document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.csv,.xls,.xlsx,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button
                onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                disabled={!uploadFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Envoyer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
