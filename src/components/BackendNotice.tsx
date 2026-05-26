import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BackendNoticeProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * Banner shown on pages whose backend endpoints don't exist yet in the Django API.
 * Lets the user know what they're seeing is mock data so wiring isn't mistaken for a bug.
 */
export function BackendNotice({ title = "Données de démonstration", children }: BackendNoticeProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
