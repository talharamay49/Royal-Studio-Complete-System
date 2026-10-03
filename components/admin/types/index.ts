export type Role = 'ADMIN' | 'STAFF' | 'CLIENT';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  whatsapp?: string;
  address?: string;
  avatar?: string;
  password?: string;
  status: UserStatus;
  linkedTeamMemberId?: string;
  linkedClientId?: string;
  createdDate?: string;
  notificationPreferences?: {
    emailAlerts: boolean;
    whatsappAlerts: boolean;
    taskReminders: boolean;
    scheduleUpdates: boolean;
  };
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  createdDate: string;
  createdBy: string;
  avatar?: string;
  hasLogin?: boolean;
  userId?: string;
  communicationPreferences?: {
    whatsappUpdates: boolean;
    emailInvoices: boolean;
    galleryNotifications: boolean;
  };
}

export type EventCategory = 
  | 'Wedding'
  | 'Birthday'
  | 'Nikah'
  | 'Corporate'
  | 'Concert'
  | 'Engagement'
  | 'Bridal Shower'
  | 'Other';

export type WeddingSubtype =
  | 'Mehndi'
  | 'Barat'
  | 'Walima'
  | 'Nikah'
  | 'Engagement'
  | 'Other';

export type EventStatus =
  | 'Inquiry'
  | 'Quotation Sent'
  | 'Confirmed'
  | 'Shoot Scheduled'
  | 'Shoot Done'
  | 'Editing'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface EventDaySchedule {
  id: string;
  eventId: string;
  dayNumber: number;
  date: string;
  eventType: string; // e.g. Mehndi, Barat, Walima
  venue: string;
  startTime: string;
  endTime: string;
  callTime: string;
  dressCode: string;
  notes: string;
  standardPackageId?: string;
  customPrice: number;
  photographersCount?: number;
  cinematographersCount?: number;
  droneIncluded?: boolean;
}

export interface Event {
  id: string;
  clientId: string;
  title: string;
  category: EventCategory;
  weddingSubtype?: WeddingSubtype;
  packageId?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  city: string;
  status: EventStatus;
  packagePrice: number;
  advancePaid: number;
  discount: number;
  tax: number;
  notes: string;
  createdBy: string;
  createdDate: string;
  updatedDate: string;
  isMultiDay: boolean;

  // Cached calculated financials
  staffCost: number;
  rentalCost: number;
  eventExpenses: number;
  netProfit: number;
  netMargin: number;
  totalClientPayments: number;
  remainingBalance: number;
}

export interface Package {
  id: string;
  name: string;
  category: EventCategory;
  description: string;
  price: number;
  duration: string; // e.g. '8 Hours' or '3 Days'
  requiredPhotographers: number;
  requiredVideographers: number;
  requiredDroneOperators: number;
  requiredAssistants: number;
  includedServices: string[];
  deliverables: string[];
  isActive: boolean;
}

export type TeamRole =
  | 'Photographer'
  | 'Videographer'
  | 'Drone Operator'
  | 'Editor'
  | 'Assistant'
  | 'Album Designer'
  | 'Manager'
  | 'Other';

export type AvailabilityStatus = 'Available' | 'Busy' | 'On Leave' | 'Inactive';

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  role: TeamRole;
  specialization: string;
  dailyRate: number;
  eventRate: number;
  availabilityStatus: AvailabilityStatus;
  isActive: boolean;
  joiningDate: string;
  notes: string;
  hasLogin?: boolean;
  userId?: string;
  loginStatus?: UserStatus;
}

export type AssignmentStatus = 'Assigned' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface EventTeamAssignment {
  id: string;
  eventId: string;
  teamMemberId: string;
  role: TeamRole;
  date: string;
  hours: number;
  rate: number;
  cost: number;
  notes: string;
  assignmentStatus: AssignmentStatus;
}

export type EquipmentCategory =
  | 'Camera'
  | 'Lens'
  | 'Drone'
  | 'Light'
  | 'Flash'
  | 'Audio'
  | 'Tripod'
  | 'Gimbal'
  | 'Memory Card'
  | 'Other';

export type EquipmentStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Damaged' | 'Retired';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  serialNumber: string;
  quantity: number;
  status: EquipmentStatus;
  rentalRate: number;
  purchaseDate: string;
  serviceAfterUses: number;
  currentUsageCount: number;
  notes: string;
}

export interface EventEquipmentAssignment {
  id: string;
  eventId: string;
  equipmentId: string;
  quantity: number;
  rentalRate: number;
  rentalCost: number;
  isCheckedOut: boolean;
  isCheckedIn: boolean;
  notes: string;
}

export interface EquipmentMaintenanceLog {
  id: string;
  equipmentId: string;
  date: string;
  issue: string;
  description: string;
  reportedBy: string;
  cost: number;
  status: 'Pending' | 'In Repair' | 'Completed' | 'Cancelled';
  repairNotes: string;
  completedDate?: string;
}

export type ExpenseCategory =
  | 'Fuel'
  | 'Catering'
  | 'Travel'
  | 'Labour'
  | 'Accommodation'
  | 'Parking'
  | 'Miscellaneous';

export interface EventExpense {
  id: string;
  eventId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  notes: string;
}

export type StudioExpenseCategory =
  | 'Rent'
  | 'Utilities'
  | 'Internet'
  | 'Software'
  | 'Marketing'
  | 'Salaries'
  | 'Repairs'
  | 'Office supplies'
  | 'Transportation'
  | 'Other';

export interface StudioExpense {
  id: string;
  category: StudioExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  recurring: boolean;
  notes: string;
  createdBy: string;
}

export type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  eventId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentTerms: string;
  notes: string;
  status: InvoiceStatus;
  createdBy: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'JazzCash' | 'EasyPaisa' | 'Other';

export interface Payment {
  id: string;
  paymentId: string;
  eventId: string;
  invoiceId?: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
  createdBy: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  eventId: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentTerms: string;
  notes: string;
  createdBy: string;
}

export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Review' | 'Completed' | 'Cancelled';

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  assigneeId?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  createdDate: string;
  completedDate?: string;
}

export type TeamPaymentType = 'Event Payment' | 'Salary' | 'Bonus' | 'Advance' | 'Reimbursement' | 'Other';

export interface TeamPayment {
  id: string;
  teamMemberId: string;
  eventId?: string;
  paymentType: TeamPaymentType;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
  createdBy: string;
}

export type BankAccountPurpose =
  | 'Business Account'
  | 'Client Payments'
  | 'Savings'
  | 'Expenses'
  | 'Payroll'
  | 'Other';

export interface BankAccountItem {
  id: string;
  accountName: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branch?: string;
  branchCode?: string;
  swiftBic?: string;
  currency: string;
  accountType: string;
  accountPurpose: BankAccountPurpose;
  isActive: boolean;
  isDefault: boolean;
  showPublicly: boolean;
  notes?: string;
}

export interface PaymentMethodItem {
  id: string;
  methodName: string;
  displayName: string;
  accountNumber?: string;
  instructions?: string;
  isActive: boolean;
  showPublicly: boolean;
}

export interface BusinessHourItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  note?: string;
}

export interface CustomSocialLink {
  id: string;
  platform: string;
  url: string;
  active: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  section: string;
  changedFields: string[];
  summary: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface AdminProfile {
  // 1. Basic Business Information
  studioName: string;
  legalName?: string;
  shortName?: string;
  businessType?: string;
  tagline: string;
  description?: string;
  aboutStudio?: string;
  businessCategory?: string;
  establishedYear?: string;
  primaryContactPerson?: string;
  designation?: string;
  businessStatus?: 'Active' | 'Holiday' | 'Temporarily Closed';

  // 2. Complete Address Management
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  landmark?: string;
  city: string;
  district?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  googleMapsUrl?: string;
  latitude?: string;
  longitude?: string;
  publicDisplayAddress?: string;

  // 3. Contact & Communication Information
  phone: string;
  phone2?: string;
  whatsapp: string;
  publicContactNumber?: string;
  publicWhatsappNumber?: string;
  emergencyContact?: string;
  smsContact?: string;
  fax?: string;
  email: string;
  secondaryEmail?: string;
  bookingEmail?: string;
  accountsEmail?: string;
  supportEmail?: string;
  notificationEmail?: string;
  emailDisplayName?: string;
  emailSignature?: string;
  website: string;

  // 4. Social Media Accounts
  facebook: string;
  instagram: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  pinterest?: string;
  twitter?: string;
  customSocialLinks?: CustomSocialLink[];

  // 5. Branding & Logos
  logo: string;
  primaryLogo?: string;
  secondaryLogo?: string;
  lightLogo?: string;
  darkLogo?: string;
  documentLogo?: string;
  websiteLogo?: string;
  favicon?: string;
  appIcon?: string;
  stampImage?: string;
  signatureImage?: string;
  emailHeaderLogo?: string;
  socialProfileImage?: string;
  socialCoverImage?: string;

  // 6. Document Branding & Stationery
  documentBackground?: string;
  quotationBackground?: string;
  invoiceBackground?: string;
  receiptBackground?: string;
  letterheadText?: string;
  documentFooterText?: string;
  defaultTermsAndConditions?: string;
  defaultInvoiceTerms?: string;
  defaultQuotationTerms?: string;

  // 7. Business Hours
  businessHours?: BusinessHourItem[];
  holidayNotice?: string;
  specialOpeningHours?: string;
  temporaryClosure?: boolean;

  // 8. Currency & Business Settings
  currency: string;
  currencySymbol?: string;
  taxRate: number;
  taxEnabled?: boolean;
  defaultDiscount?: number;
  quotationPrefix: string;
  invoicePrefix: string;
  paymentTerms: string;

  // 9. Bank Accounts & Payment Methods
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  bankAccounts?: BankAccountItem[];
  paymentMethods?: PaymentMethodItem[];

  // 10. Tax & Legal Business Information
  taxId?: string;
  ntn?: string;
  strn?: string;
  businessRegistrationNumber?: string;
  registeredAddress?: string;
  invoiceLegalFooter?: string;
  legalTerms?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  refundPolicy?: string;
  cancellationPolicy?: string;

  // 11. Website / Public Profile Settings
  publicStudioName?: string;
  websiteTitle?: string;
  websiteDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  openGraphImage?: string;
  showBusinessHoursPublicly?: boolean;

  notificationPreferences: {
    overdueInvoices: boolean;
    urgentTasks: boolean;
    equipmentMaintenance: boolean;
    lowAvailability: boolean;
  };
}

export interface TempHireRecommendation {
  id: string;
  eventId: string;
  requiredStaff: number;
  availableStaff: number;
  shortageCount: number;
  missingRoles: string[];
  suggestedTempMembers: Array<{ role: string; suggestedRate: number; reason: string }>;
  createdAt: string;
}

export interface AIBriefing {
  highlight: string;
  urgentAction: string;
  riskAlert: string;
  opportunity: string;
  todaysTip: string;
  generatedAt: string;
}
