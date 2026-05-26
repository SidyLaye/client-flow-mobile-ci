import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import type { Client } from "@/lib/api-types";

export default function MessagesList() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", { all: true }],
    queryFn: () => api.clients.list({}),
    retry: false,
  });

  const clients: Client[] = useMemo(
    () => clientsQuery.data?.results ?? [],
    [clientsQuery.data],
  );

  // Auto-select the first client once loaded.
  useEffect(() => {
    if (!selectedClient && clients.length > 0) {
      setSelectedClient(clients[0].id);
    }
  }, [clients, selectedClient]);

  const messagesQuery = useQuery({
    queryKey: ["messages", { client: selectedClient }],
    queryFn: () => api.messages.list({ client: selectedClient! }),
    enabled: Boolean(selectedClient),
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.messages.create({
        client: selectedClient!,
        body: body.trim(),
        is_internal: isInternal,
      }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", { client: selectedClient }] });
    },
    onError: (err: ApiError) => toast.error("Envoi impossible", { description: err.message }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.messages.markAllRead(selectedClient!),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["messages", { client: selectedClient }] }),
  });

  const messages = messagesQuery.data?.results ?? [];

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Mark all as read whenever we select a thread.
  useEffect(() => {
    if (selectedClient) markAllMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  const activeClient = clients.find((c) => c.id === selectedClient);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold">Messagerie</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conversations avec vos clients
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {clients.length} client(s)
            </p>
          </div>
          <div className="overflow-y-auto flex-1">
            {clientsQuery.isLoading && (
              <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-muted-foreground" />
            )}
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClient(c.id)}
                className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/40 transition ${
                  c.id === selectedClient ? "bg-muted/60" : ""
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {c.company_name || `${c.first_name} ${c.last_name}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-card border border-border rounded-lg flex flex-col">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">
              {activeClient
                ? activeClient.company_name ||
                  `${activeClient.first_name} ${activeClient.last_name}`
                : "Sélectionnez un client"}
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messagesQuery.isLoading && (
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            )}
            {!messagesQuery.isLoading && messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun message dans ce fil.
              </p>
            )}
            {messages.map((m) => {
              const isMe = m.sender === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      m.is_internal
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                        : isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-80">
                        {m.sender_name || m.sender_email || "—"}
                      </span>
                      {m.is_internal && <Lock className="h-3 w-3" />}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[11px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          {selectedClient && (
            <div className="border-t p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={isInternal} onCheckedChange={setIsInternal} />
                  Note interne (invisible au client)
                </label>
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Écrire un message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="resize-none"
                />
                <Button
                  disabled={!body.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                  className="self-end"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
