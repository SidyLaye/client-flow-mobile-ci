import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { sendMessage } from "@/lib/client-data";

interface Props {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMessageDialog({ clientId, clientName, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const mutation = useMutation({
    mutationFn: () => sendMessage({ client_id: clientId, body: body.trim(), is_internal: isInternal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-messages", clientId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(isInternal ? "Note interne enregistrée" : "Message envoyé");
      setBody("");
      setIsInternal(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error("Échec", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setBody(""); setIsInternal(false); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isInternal ? "Nouvelle note interne" : "Nouveau message"}</DialogTitle>
          <DialogDescription>
            Pour <span className="font-medium">{clientName}</span>
            {isInternal ? " · visible par votre équipe uniquement" : " · le client recevra ce message"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className={`flex items-center justify-between rounded-lg border p-3 ${
            isInternal ? "border-amber-300 bg-amber-50" : "border-border bg-card"
          }`}>
            <div className="flex items-center gap-2.5">
              {isInternal ? <FileText className="h-4 w-4 text-amber-600" /> : <Send className="h-4 w-4 text-primary" />}
              <div>
                <Label htmlFor="internal-toggle" className="cursor-pointer text-sm font-medium">
                  {isInternal ? "Note interne" : "Message au client"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isInternal ? "Reste invisible pour le client" : "Le client le voit dans son espace"}
                </p>
              </div>
            </div>
            <Switch id="internal-toggle" checked={isInternal} onCheckedChange={setIsInternal} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-body">Message</Label>
            <Textarea
              id="message-body"
              rows={6}
              placeholder={isInternal ? "Note pour l'équipe..." : "Bonjour, ..."}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{body.length} caractères</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !body.trim()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {isInternal ? "Enregistrer la note" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
