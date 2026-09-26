-- ============================================================
-- Tasks (workload tracking) and Deadlines (regulatory dates)
-- Apply via Supabase SQL Editor or `supabase db push`.
-- ============================================================

-- ── Tasks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','blocked','done')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID,             -- auth user id
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks not bound to a client (general firm tasks): admin who created them sees them.
-- Tasks bound to a client: admin who owns the client sees them.
CREATE POLICY "Admins access own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND (
      client_id IS NULL AND created_by = auth.uid()
      OR (client_id IS NOT NULL AND admin_owns_client(client_id))
    )
  );

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Deadlines ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- e.g. 'tva', 'bilan', 'liasse_fiscale', 'is', 'cfe'
  label TEXT,                   -- free-form display name
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','overdue')),
  assigned_to UUID,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deadlines_client ON public.deadlines(client_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON public.deadlines(status);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins access own deadlines" ON public.deadlines
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id)
  );

CREATE TRIGGER update_deadlines_updated_at BEFORE UPDATE ON public.deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
