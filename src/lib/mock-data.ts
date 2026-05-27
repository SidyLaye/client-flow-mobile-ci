// Mock data for the accounting back-office

export type ClientStatus = 'actif' | 'en_creation' | 'suspendu' | 'ferme';
export type DocumentStatus = 'recu' | 'en_revue' | 'valide' | 'refuse' | 'incomplet' | 'archive';
export type RequestStatus = 'brouillon' | 'envoyee' | 'vue' | 'partielle' | 'completee' | 'en_retard' | 'annulee';
export type TaskStatus = 'a_faire' | 'en_cours' | 'bloque' | 'termine' | 'annule';
export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente';
export type DeadlineStatus = 'a_preparer' | 'pieces_attente' | 'pret' | 'envoye' | 'valide' | 'en_retard';

export interface Client {
  id: string;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  siret: string;
  status: ClientStatus;
  assignedAccountant: string;
  missingDocs: number;
  lastActivity: string;
  nextDeadline: string;
  isUrgent: boolean;
  vatRegime: string;
  vatFrequency: string;
  fiscalYearEnd: string;
}

export interface Document {
  id: string;
  clientId: string;
  fileName: string;
  category: string;
  uploadDate: string;
  uploadedBy: string;
  status: DocumentStatus;
  period: string;
  comment: string;
}

export interface DocumentRequest {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  requestedType: string;
  dueDate: string;
  priority: TaskPriority;
  status: RequestStatus;
  lastReminder: string | null;
  reminderCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  clientId: string;
  clientName: string;
  senderName: string;
  senderRole: 'comptable' | 'client';
  body: string;
  isInternal: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  category: string;
}

export interface Deadline {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  dueDate: string;
  status: DeadlineStatus;
  assignedTo: string;
  notes: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export const mockClients: Client[] = [
  { id: '1', companyName: 'SARL Dupont & Fils', contactFirstName: 'Jean', contactLastName: 'Dupont', email: 'jean@dupont-fils.fr', phone: '01 23 45 67 89', siret: '123 456 789 00012', status: 'actif', assignedAccountant: 'Marie Leroy', missingDocs: 3, lastActivity: '2026-04-05', nextDeadline: '2026-04-15', isUrgent: true, vatRegime: 'Réel normal', vatFrequency: 'Mensuelle', fiscalYearEnd: '31/12' },
  { id: '2', companyName: 'SAS TechNova', contactFirstName: 'Sophie', contactLastName: 'Martin', email: 'sophie@technova.fr', phone: '01 98 76 54 32', siret: '987 654 321 00034', status: 'actif', assignedAccountant: 'Marie Leroy', missingDocs: 0, lastActivity: '2026-04-04', nextDeadline: '2026-04-20', isUrgent: false, vatRegime: 'Réel simplifié', vatFrequency: 'Trimestrielle', fiscalYearEnd: '31/12' },
  { id: '3', companyName: 'Auto-entreprise Moreau', contactFirstName: 'Pierre', contactLastName: 'Moreau', email: 'pierre.moreau@gmail.com', phone: '06 12 34 56 78', siret: '456 789 123 00056', status: 'actif', assignedAccountant: 'Thomas Bernard', missingDocs: 5, lastActivity: '2026-03-28', nextDeadline: '2026-04-10', isUrgent: true, vatRegime: 'Micro-entreprise', vatFrequency: 'Trimestrielle', fiscalYearEnd: '31/12' },
  { id: '4', companyName: 'Association Les Amis du Parc', contactFirstName: 'Claire', contactLastName: 'Petit', email: 'contact@amisduparc.org', phone: '01 11 22 33 44', siret: '111 222 333 00078', status: 'en_creation', assignedAccountant: 'Marie Leroy', missingDocs: 8, lastActivity: '2026-04-06', nextDeadline: '2026-05-01', isUrgent: false, vatRegime: 'Franchise en base', vatFrequency: 'Annuelle', fiscalYearEnd: '30/06' },
  { id: '5', companyName: 'EURL Garage Central', contactFirstName: 'Marc', contactLastName: 'Lefebvre', email: 'marc@garagecentral.fr', phone: '01 55 66 77 88', siret: '555 666 777 00090', status: 'suspendu', assignedAccountant: 'Thomas Bernard', missingDocs: 12, lastActivity: '2026-02-15', nextDeadline: '2026-04-30', isUrgent: true, vatRegime: 'Réel normal', vatFrequency: 'Mensuelle', fiscalYearEnd: '31/12' },
  { id: '6', companyName: 'SCI Immobilière du Sud', contactFirstName: 'Isabelle', contactLastName: 'Rousseau', email: 'isabelle@sci-sud.fr', phone: '04 11 22 33 44', siret: '222 333 444 00011', status: 'actif', assignedAccountant: 'Marie Leroy', missingDocs: 1, lastActivity: '2026-04-03', nextDeadline: '2026-04-25', isUrgent: false, vatRegime: 'Réel normal', vatFrequency: 'Mensuelle', fiscalYearEnd: '31/12' },
  { id: '7', companyName: 'SARL Boulangerie Tradition', contactFirstName: 'François', contactLastName: 'Girard', email: 'francois@boulangerie-tradition.fr', phone: '01 44 55 66 77', siret: '333 444 555 00022', status: 'actif', assignedAccountant: 'Thomas Bernard', missingDocs: 2, lastActivity: '2026-04-01', nextDeadline: '2026-04-18', isUrgent: false, vatRegime: 'Réel simplifié', vatFrequency: 'Trimestrielle', fiscalYearEnd: '31/12' },
];

export const mockDocuments: Document[] = [
  { id: '1', clientId: '1', fileName: 'Facture_mars_2026.pdf', category: 'Facture achat', uploadDate: '2026-04-02', uploadedBy: 'Client', status: 'valide', period: 'Mars 2026', comment: '' },
  { id: '2', clientId: '1', fileName: 'Releve_bancaire_mars.pdf', category: 'Relevé bancaire', uploadDate: '2026-04-05', uploadedBy: 'Client', status: 'en_revue', period: 'Mars 2026', comment: 'À vérifier le solde' },
  { id: '3', clientId: '1', fileName: 'Note_frais_mars.pdf', category: 'Note de frais', uploadDate: '2026-04-03', uploadedBy: 'Client', status: 'refuse', period: 'Mars 2026', comment: 'Justificatif manquant' },
  { id: '4', clientId: '2', fileName: 'Declaration_TVA_T1.pdf', category: 'Déclaration TVA', uploadDate: '2026-04-01', uploadedBy: 'Comptable', status: 'valide', period: 'T1 2026', comment: '' },
  { id: '5', clientId: '2', fileName: 'Bilan_2025.pdf', category: 'Bilan', uploadDate: '2026-03-15', uploadedBy: 'Comptable', status: 'valide', period: '2025', comment: '' },
  { id: '6', clientId: '3', fileName: 'Factures_vente_fev.zip', category: 'Facture vente', uploadDate: '2026-03-20', uploadedBy: 'Client', status: 'incomplet', period: 'Février 2026', comment: 'Il manque 3 factures' },
];

export const mockRequests: DocumentRequest[] = [
  { id: '1', clientId: '1', clientName: 'SARL Dupont & Fils', title: 'Relevés bancaires mars 2026', description: 'Merci de transmettre les relevés bancaires du mois de mars pour tous les comptes.', requestedType: 'Relevé bancaire', dueDate: '2026-04-10', priority: 'haute', status: 'envoyee', lastReminder: '2026-04-04', reminderCount: 1, createdAt: '2026-03-28' },
  { id: '2', clientId: '3', clientName: 'Auto-entreprise Moreau', title: 'Factures achat T1 2026', description: 'Merci d\'envoyer toutes les factures d\'achat du premier trimestre.', requestedType: 'Facture achat', dueDate: '2026-04-08', priority: 'urgente', status: 'en_retard', lastReminder: '2026-04-05', reminderCount: 3, createdAt: '2026-03-15' },
  { id: '3', clientId: '2', clientName: 'SAS TechNova', title: 'Contrat de bail', description: 'Merci de transmettre le contrat de bail des nouveaux locaux.', requestedType: 'Contrat', dueDate: '2026-04-20', priority: 'normale', status: 'vue', lastReminder: null, reminderCount: 0, createdAt: '2026-04-01' },
  { id: '4', clientId: '5', clientName: 'EURL Garage Central', title: 'Ensemble des pièces comptables 2025', description: 'Suite à la reprise de dossier, merci de fournir l\'ensemble des pièces comptables de l\'exercice 2025.', requestedType: 'Autre', dueDate: '2026-04-30', priority: 'haute', status: 'partielle', lastReminder: '2026-04-03', reminderCount: 2, createdAt: '2026-03-01' },
];

export const mockMessages: Message[] = [
  { id: '1', clientId: '1', clientName: 'SARL Dupont & Fils', senderName: 'Jean Dupont', senderRole: 'client', body: 'Bonjour, je vous envoie les relevés bancaires de mars. Pouvez-vous me confirmer la réception ?', isInternal: false, readAt: '2026-04-05T10:30:00', createdAt: '2026-04-05T09:15:00' },
  { id: '2', clientId: '1', clientName: 'SARL Dupont & Fils', senderName: 'Marie Leroy', senderRole: 'comptable', body: 'Bien reçu, merci. Il manque toutefois le relevé du compte secondaire.', isInternal: false, readAt: null, createdAt: '2026-04-05T10:45:00' },
  { id: '3', clientId: '1', clientName: 'SARL Dupont & Fils', senderName: 'Marie Leroy', senderRole: 'comptable', body: 'Note interne : client souvent en retard sur les pièces bancaires, relancer systématiquement 5 jours avant.', isInternal: true, readAt: null, createdAt: '2026-04-05T10:50:00' },
  { id: '4', clientId: '3', clientName: 'Auto-entreprise Moreau', senderName: 'Pierre Moreau', senderRole: 'client', body: 'Je suis en déplacement cette semaine, je vous envoie les factures dès lundi.', isInternal: false, readAt: '2026-04-04T14:00:00', createdAt: '2026-04-04T11:20:00' },
  { id: '5', clientId: '2', clientName: 'SAS TechNova', senderName: 'Sophie Martin', senderRole: 'client', body: 'Bonjour Marie, est-ce que le bilan 2025 est prêt ? Nous en avons besoin pour la banque.', isInternal: false, readAt: null, createdAt: '2026-04-06T08:00:00' },
];

export const mockTasks: Task[] = [
  { id: '1', clientId: '1', clientName: 'SARL Dupont & Fils', title: 'Vérifier TVA mars', description: 'Contrôler la déclaration TVA de mars', assignedTo: 'Marie Leroy', priority: 'haute', dueDate: '2026-04-12', status: 'en_cours', category: 'TVA' },
  { id: '2', clientId: '3', clientName: 'Auto-entreprise Moreau', title: 'Relancer pièces manquantes', description: 'Relancer Pierre Moreau pour les factures du T1', assignedTo: 'Thomas Bernard', priority: 'urgente', dueDate: '2026-04-08', status: 'a_faire', category: 'Documents' },
  { id: '3', clientId: '2', clientName: 'SAS TechNova', title: 'Préparer bilan 2025', description: 'Finaliser le bilan annuel 2025', assignedTo: 'Marie Leroy', priority: 'haute', dueDate: '2026-04-15', status: 'en_cours', category: 'Bilan' },
  { id: '4', clientId: '4', clientName: 'Association Les Amis du Parc', title: 'Vérifier informations légales', description: 'Vérifier le Kbis et les statuts de l\'association', assignedTo: 'Marie Leroy', priority: 'normale', dueDate: '2026-04-20', status: 'a_faire', category: 'Juridique' },
  { id: '5', clientId: '5', clientName: 'EURL Garage Central', title: 'Appeler le client', description: 'Appeler Marc pour faire le point sur la situation du dossier', assignedTo: 'Thomas Bernard', priority: 'haute', dueDate: '2026-04-07', status: 'bloque', category: 'Général' },
  { id: '6', clientId: '1', clientName: 'SARL Dupont & Fils', title: 'Valider relevé bancaire', description: 'Valider le relevé bancaire de mars après vérification', assignedTo: 'Marie Leroy', priority: 'normale', dueDate: '2026-04-14', status: 'a_faire', category: 'Documents' },
];

export const mockDeadlines: Deadline[] = [
  { id: '1', clientId: '1', clientName: 'SARL Dupont & Fils', type: 'TVA', dueDate: '2026-04-15', status: 'pieces_attente', assignedTo: 'Marie Leroy', notes: 'Relevé bancaire manquant' },
  { id: '2', clientId: '3', clientName: 'Auto-entreprise Moreau', type: 'TVA', dueDate: '2026-04-10', status: 'en_retard', assignedTo: 'Thomas Bernard', notes: 'Factures non reçues' },
  { id: '3', clientId: '2', clientName: 'SAS TechNova', type: 'Bilan annuel', dueDate: '2026-04-20', status: 'pret', assignedTo: 'Marie Leroy', notes: '' },
  { id: '4', clientId: '6', clientName: 'SCI Immobilière du Sud', type: 'TVA', dueDate: '2026-04-25', status: 'a_preparer', assignedTo: 'Marie Leroy', notes: '' },
  { id: '5', clientId: '5', clientName: 'EURL Garage Central', type: 'Liasse fiscale', dueDate: '2026-04-30', status: 'pieces_attente', assignedTo: 'Thomas Bernard', notes: 'Dossier suspendu, pièces manquantes' },
  { id: '6', clientId: '7', clientName: 'SARL Boulangerie Tradition', type: 'TVA', dueDate: '2026-04-18', status: 'a_preparer', assignedTo: 'Thomas Bernard', notes: '' },
  { id: '7', clientId: '4', clientName: 'Association Les Amis du Parc', type: 'Bilan annuel', dueDate: '2026-05-01', status: 'a_preparer', assignedTo: 'Marie Leroy', notes: 'Nouveau client, clôture au 30/06' },
];

export const mockNotifications: Notification[] = [
  { id: '1', type: 'document', title: 'Document reçu', body: 'Jean Dupont a envoyé "Releve_bancaire_mars.pdf"', isRead: false, createdAt: '2026-04-05T09:15:00' },
  { id: '2', type: 'message', title: 'Nouveau message', body: 'Sophie Martin vous a envoyé un message', isRead: false, createdAt: '2026-04-06T08:00:00' },
  { id: '3', type: 'deadline', title: 'Échéance proche', body: 'TVA Auto-entreprise Moreau - échéance dans 4 jours', isRead: false, createdAt: '2026-04-06T07:00:00' },
  { id: '4', type: 'request', title: 'Demande en retard', body: 'Factures achat T1 - Auto-entreprise Moreau', isRead: true, createdAt: '2026-04-05T07:00:00' },
  { id: '5', type: 'task', title: 'Tâche en retard', body: 'Appeler EURL Garage Central', isRead: true, createdAt: '2026-04-04T07:00:00' },
];

// Invoice types
export type InvoiceType = 'facture' | 'devis' | 'avoir';
export type InvoiceStatus = 'brouillon' | 'validee' | 'envoyee' | 'vue' | 'partiellement_payee' | 'payee' | 'en_retard' | 'annulee' | 'avoir_emis';
export type PaymentStatus = 'non_paye' | 'partiellement_paye' | 'paye' | 'rembourse';
export type PaymentMethod = 'virement' | 'carte' | 'especes' | 'cheque' | 'prelevement';
export type QuoteStatus = 'brouillon' | 'envoyee' | 'accepte' | 'refuse' | 'expire';

export interface InvoiceItem {
  id: string;
  label: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  discountPercent: number;
  vatRate: number;
  lineTotalHt: number;
  lineTotalTtc: number;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  type: InvoiceType;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotalHt: number;
  totalDiscountHt: number;
  totalVat: number;
  totalTtc: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  notes: string;
  terms: string;
  footer: string;
  sourceQuoteId: string | null;
  originalInvoiceId: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  createdAt: string;
  validatedAt: string | null;
  sentAt: string | null;
}

export const mockInvoices: Invoice[] = [
  {
    id: 'inv1', clientId: '1', clientName: 'SARL Dupont & Fils', type: 'facture', number: 'FAC-2026-001', status: 'payee', issueDate: '2026-03-01', dueDate: '2026-03-31', currency: 'EUR',
    subtotalHt: 1500, totalDiscountHt: 0, totalVat: 300, totalTtc: 1800, amountPaid: 1800, amountDue: 0, paymentStatus: 'paye',
    notes: 'Merci pour votre confiance', terms: 'Paiement à 30 jours', footer: '', sourceQuoteId: null, originalInvoiceId: null,
    items: [
      { id: 'li1', label: 'Tenue comptable février 2026', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 800, discountPercent: 0, vatRate: 20, lineTotalHt: 800, lineTotalTtc: 960 },
      { id: 'li2', label: 'Déclaration TVA février 2026', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 350, discountPercent: 0, vatRate: 20, lineTotalHt: 350, lineTotalTtc: 420 },
      { id: 'li3', label: 'Conseil juridique', description: 'Analyse contrat fournisseur', quantity: 2, unit: 'heures', unitPriceHt: 175, discountPercent: 0, vatRate: 20, lineTotalHt: 350, lineTotalTtc: 420 },
    ],
    payments: [{ id: 'p1', invoiceId: 'inv1', amount: 1800, paymentDate: '2026-03-25', paymentMethod: 'virement', reference: 'VIR-20260325', notes: '', createdAt: '2026-03-25' }],
    createdAt: '2026-03-01', validatedAt: '2026-03-01', sentAt: '2026-03-01',
  },
  {
    id: 'inv2', clientId: '1', clientName: 'SARL Dupont & Fils', type: 'facture', number: 'FAC-2026-002', status: 'envoyee', issueDate: '2026-04-01', dueDate: '2026-04-30', currency: 'EUR',
    subtotalHt: 1150, totalDiscountHt: 0, totalVat: 230, totalTtc: 1380, amountPaid: 0, amountDue: 1380, paymentStatus: 'non_paye',
    notes: '', terms: 'Paiement à 30 jours', footer: '', sourceQuoteId: null, originalInvoiceId: null,
    items: [
      { id: 'li4', label: 'Tenue comptable mars 2026', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 800, discountPercent: 0, vatRate: 20, lineTotalHt: 800, lineTotalTtc: 960 },
      { id: 'li5', label: 'Déclaration TVA mars 2026', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 350, discountPercent: 0, vatRate: 20, lineTotalHt: 350, lineTotalTtc: 420 },
    ],
    payments: [],
    createdAt: '2026-04-01', validatedAt: '2026-04-01', sentAt: '2026-04-02',
  },
  {
    id: 'inv3', clientId: '2', clientName: 'SAS TechNova', type: 'facture', number: 'FAC-2026-003', status: 'en_retard', issueDate: '2026-02-15', dueDate: '2026-03-15', currency: 'EUR',
    subtotalHt: 3200, totalDiscountHt: 320, totalVat: 576, totalTtc: 3456, amountPaid: 1000, amountDue: 2456, paymentStatus: 'partiellement_paye',
    notes: '', terms: 'Paiement à 30 jours', footer: '', sourceQuoteId: null, originalInvoiceId: null,
    items: [
      { id: 'li6', label: 'Mission bilan 2025', description: 'Préparation et révision du bilan annuel', quantity: 1, unit: 'forfait', unitPriceHt: 2500, discountPercent: 10, vatRate: 20, lineTotalHt: 2250, lineTotalTtc: 2700 },
      { id: 'li7', label: 'Conseil fiscal', description: '', quantity: 4, unit: 'heures', unitPriceHt: 175, discountPercent: 0, vatRate: 20, lineTotalHt: 700, lineTotalTtc: 840 },
    ],
    payments: [{ id: 'p2', invoiceId: 'inv3', amount: 1000, paymentDate: '2026-03-10', paymentMethod: 'virement', reference: 'VIR-20260310', notes: 'Acompte', createdAt: '2026-03-10' }],
    createdAt: '2026-02-15', validatedAt: '2026-02-15', sentAt: '2026-02-16',
  },
  {
    id: 'inv4', clientId: '7', clientName: 'SARL Boulangerie Tradition', type: 'devis', number: 'DEV-2026-001', status: 'envoyee', issueDate: '2026-04-03', dueDate: '2026-05-03', currency: 'EUR',
    subtotalHt: 4800, totalDiscountHt: 0, totalVat: 960, totalTtc: 5760, amountPaid: 0, amountDue: 5760, paymentStatus: 'non_paye',
    notes: 'Devis pour mission annuelle 2026', terms: 'Validité 30 jours', footer: '', sourceQuoteId: null, originalInvoiceId: null,
    items: [
      { id: 'li8', label: 'Tenue comptable annuelle', description: 'Forfait mensuel x 12', quantity: 12, unit: 'mois', unitPriceHt: 300, discountPercent: 0, vatRate: 20, lineTotalHt: 3600, lineTotalTtc: 4320 },
      { id: 'li9', label: 'Bilan annuel', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 1200, discountPercent: 0, vatRate: 20, lineTotalHt: 1200, lineTotalTtc: 1440 },
    ],
    payments: [],
    createdAt: '2026-04-03', validatedAt: '2026-04-03', sentAt: '2026-04-03',
  },
  {
    id: 'inv5', clientId: '6', clientName: 'SCI Immobilière du Sud', type: 'facture', number: 'FAC-2026-004', status: 'brouillon', issueDate: '2026-04-06', dueDate: '2026-05-06', currency: 'EUR',
    subtotalHt: 650, totalDiscountHt: 0, totalVat: 130, totalTtc: 780, amountPaid: 0, amountDue: 780, paymentStatus: 'non_paye',
    notes: '', terms: 'Paiement à 30 jours', footer: '', sourceQuoteId: null, originalInvoiceId: null,
    items: [
      { id: 'li10', label: 'Déclaration revenus fonciers', description: '', quantity: 1, unit: 'forfait', unitPriceHt: 450, discountPercent: 0, vatRate: 20, lineTotalHt: 450, lineTotalTtc: 540 },
      { id: 'li11', label: 'Assemblée générale', description: 'Préparation PV AG', quantity: 1, unit: 'forfait', unitPriceHt: 200, discountPercent: 0, vatRate: 20, lineTotalHt: 200, lineTotalTtc: 240 },
    ],
    payments: [],
    createdAt: '2026-04-06', validatedAt: null, sentAt: null,
  },
  {
    id: 'inv6', clientId: '1', clientName: 'SARL Dupont & Fils', type: 'avoir', number: 'AV-2026-001', status: 'validee', issueDate: '2026-03-15', dueDate: '2026-03-15', currency: 'EUR',
    subtotalHt: -350, totalDiscountHt: 0, totalVat: -70, totalTtc: -420, amountPaid: -420, amountDue: 0, paymentStatus: 'rembourse',
    notes: 'Avoir sur prestation conseil non effectuée', terms: '', footer: '', sourceQuoteId: null, originalInvoiceId: 'inv1',
    items: [
      { id: 'li12', label: 'Conseil juridique - annulation', description: 'Annulation prestation', quantity: 2, unit: 'heures', unitPriceHt: -175, discountPercent: 0, vatRate: 20, lineTotalHt: -350, lineTotalTtc: -420 },
    ],
    payments: [{ id: 'p3', invoiceId: 'inv6', amount: -420, paymentDate: '2026-03-20', paymentMethod: 'virement', reference: 'VIR-AV-001', notes: 'Remboursement avoir', createdAt: '2026-03-20' }],
    createdAt: '2026-03-15', validatedAt: '2026-03-15', sentAt: null,
  },
];

export const statusLabels: Record<string, string> = {
  actif: 'Actif',
  en_creation: 'En création',
  suspendu: 'Suspendu',
  ferme: 'Fermé',
  recu: 'Reçu',
  en_revue: 'En revue',
  valide: 'Validé',
  refuse: 'Refusé',
  incomplet: 'Incomplet',
  archive: 'Archivé',
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  vue: 'Vue',
  partielle: 'Partielle',
  completee: 'Complétée',
  en_retard: 'En retard',
  annulee: 'Annulée',
  a_faire: 'À faire',
  en_cours: 'En cours',
  bloque: 'Bloqué',
  termine: 'Terminé',
  annule: 'Annulé',
  a_preparer: 'À préparer',
  pieces_attente: 'Pièces en attente',
  pret: 'Prêt',
  envoye: 'Envoyé',
  validee: 'Validée',
  partiellement_payee: 'Part. payée',
  payee: 'Payée',
  avoir_emis: 'Avoir émis',
  non_paye: 'Non payé',
  partiellement_paye: 'Part. payé',
  paye: 'Payé',
  rembourse: 'Remboursé',
  accepte: 'Accepté',
  expire: 'Expiré',
};

export const statusColors: Record<string, string> = {
  actif: 'status-active',
  en_creation: 'status-info',
  suspendu: 'status-pending',
  ferme: 'status-muted',
  recu: 'status-info',
  en_revue: 'status-pending',
  valide: 'status-active',
  refuse: 'status-urgent',
  incomplet: 'status-pending',
  archive: 'status-muted',
  brouillon: 'status-muted',
  envoyee: 'status-info',
  vue: 'status-info',
  partielle: 'status-pending',
  completee: 'status-active',
  en_retard: 'status-urgent',
  annulee: 'status-muted',
  a_faire: 'status-info',
  en_cours: 'status-pending',
  bloque: 'status-urgent',
  termine: 'status-active',
  annule: 'status-muted',
  a_preparer: 'status-info',
  pieces_attente: 'status-pending',
  pret: 'status-active',
  envoye: 'status-active',
  validee: 'status-active',
  partiellement_payee: 'status-pending',
  payee: 'status-active',
  avoir_emis: 'status-info',
  non_paye: 'status-urgent',
  partiellement_paye: 'status-pending',
  paye: 'status-active',
  rembourse: 'status-info',
  accepte: 'status-active',
  expire: 'status-muted',
};

export function getStatusBadge(status: string) {
  return `status-badge ${statusColors[status] || 'status-muted'}`;
}
