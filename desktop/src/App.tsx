import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ClientsList from "./pages/ClientsList";
import CreateClient from "./pages/CreateClient";
import ClientDetail from "./pages/ClientDetail";
import DocumentsList from "./pages/DocumentsList";
import DocumentDetail from "./pages/DocumentDetail";
import RequestsList from "./pages/RequestsList";
import MessagesList from "./pages/MessagesList";
import TasksList from "./pages/TasksList";
import DeadlinesList from "./pages/DeadlinesList";
import InvoicesList from "./pages/InvoicesList";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceDetail from "./pages/InvoiceDetail";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/nouveau" element={<CreateClient />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/documents" element={<DocumentsList />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
              <Route path="/demandes" element={<RequestsList />} />
              <Route path="/messages" element={<MessagesList />} />
              <Route path="/taches" element={<TasksList />} />
              <Route path="/echeances" element={<DeadlinesList />} />
              <Route path="/factures" element={<InvoicesList />} />
              <Route path="/factures/nouveau" element={<CreateInvoice />} />
              <Route path="/factures/:id" element={<InvoiceDetail />} />
              <Route path="/parametres" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/client-portal" element={<ClientPortal />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
