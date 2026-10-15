import crypto from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';
import { db as firestoreDb, testFirestoreConnection } from '@/lib/firebase';
import {
  User,
  Client,
  Event,
  EventDaySchedule,
  Package,
  TeamMember,
  EventTeamAssignment,
  Equipment,
  EventEquipmentAssignment,
  EquipmentMaintenanceLog,
  EventExpense,
  StudioExpense,
  Invoice,
  Payment,
  Quotation,
  EventTask,
  TeamPayment,
  AdminProfile,
  TempHireRecommendation,
  AuditLogEntry,
  EventMediaDeliveryVault,
  AdminOnlyGoogleDriveCredentials,
} from '@/components/admin/types';
import { calculateEventTotals, computeInvoiceStatus } from '@/components/admin/utils/calculations';
import {
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
  defaultWebsiteCustomization,
  defaultConnectedSocialAccounts,
  defaultSocialMediaPosts,
} from '@/lib/data';
import type {
  PortfolioItem,
  PricingPackage,
  Service,
  Testimonial,
  BlogPost,
  WebsiteCustomizationConfig,
  ConnectedSocialAccount,
  SocialMediaPostItem,
} from '@/types';
import { getDatabaseAdapter, DatabaseEngineStats } from '@/lib/db/storageAdapter';

export { firebaseConfig, firestoreDb, testFirestoreConnection };

export interface WebsiteLead {
  id: string;
  brideName: string;
  groomName: string;
  phone: string;
  email: string;
  weddingDate: string;
  venue: string;
  city: string;
  services: string;
  budget?: string;
  message?: string;
  status: 'New' | 'Contacted' | 'Booked' | 'Archived';
  submittedAt: string;
  linkedEventId?: string;
}

export interface WebsiteCMSData {
  portfolioItems: PortfolioItem[];
  pricingPackages: PricingPackage[];
  detailedServices: Service[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
  websiteLeads: WebsiteLead[];
  websiteCustomization?: WebsiteCustomizationConfig;
  connectedSocialAccounts?: ConnectedSocialAccount[];
  socialMediaPosts?: SocialMediaPostItem[];
}

export function hashPassword(plain: string): string {
  if (plain.startsWith('scrypt$')) return plain;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(input: string, stored?: string): boolean {
  if (!stored || !input) return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const derived = crypto.scryptSync(input, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  }
  return stored === input;
}

export interface DatabaseSchema {
  users: User[];
  profile: AdminProfile;
  profileAuditLogs?: AuditLogEntry[];
  cms?: WebsiteCMSData;
  sessions?: Record<string, { userId: string; expiresAt: number; lastActiveAt: number }>;
  clients: Client[];
  events: Event[];
  daySchedules: EventDaySchedule[];
  packages: Package[];
  teamMembers: TeamMember[];
  teamAssignments: EventTeamAssignment[];
  teamPayments: TeamPayment[];
  equipment: Equipment[];
  equipmentAssignments: EventEquipmentAssignment[];
  maintenanceLogs: EquipmentMaintenanceLog[];
  eventExpenses: EventExpense[];
  studioExpenses: StudioExpense[];
  invoices: Invoice[];
  payments: Payment[];
  quotations: Quotation[];
  tasks: EventTask[];
  tempHireRecommendations: TempHireRecommendation[];
}

export function getDefaultStudioProfile(): AdminProfile {
  return {
    // 1. Basic Business Information
    studioName: 'Royal Studio',
    legalName: 'Royal Studio Photography & Cinematic Films',
    shortName: 'Royal Studio',
    businessType: 'Luxury Photography & Cinematography Studio',
    tagline: 'Luxury wedding photography, cinematic films, and brand shoots.',
    description: 'Luxury wedding photography, cinematic films, and brand shoots.',
    aboutStudio:
      'Royal Studio is a luxury wedding photography and cinematic filmmaking company founded in 2018 by Muhammad Ramzan and Talha Ramay. Based in Burewala, Punjab, Pakistan, we have documented 3000+ weddings and commercial productions across Pakistan with timeless artistry.',
    businessCategory: 'Wedding Photography, Cinematography & Commercial Media',
    establishedYear: '2018',
    primaryContactPerson: 'Talha Ramay & Muhammad Ramzan',
    designation: 'Co-Founders & Creative Directors',
    businessStatus: 'Active',

    // 2. Complete Address Management
    address: 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan',
    addressLine1: 'Al Jannat Town Entrance, Canal Bungalow Road',
    addressLine2: 'Opposite Habib Mall',
    area: 'Canal Bungalow Road / Al Jannat Town',
    landmark: 'Opposite Habib Mall',
    city: 'Burewala',
    district: 'Burewala (Vehari)',
    province: 'Punjab',
    country: 'Pakistan',
    postalCode: '61010',
    googleMapsUrl: 'https://maps.app.goo.gl/mQPek7wm4nCVjy8o9',
    latitude: '30.1667',
    longitude: '72.6833',
    publicDisplayAddress: 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan',

    // 3. Contact & Communication Information
    phone: '0308-4877073',
    phone2: '0303-2213806',
    whatsapp: '0308-4877073',
    publicContactNumber: '0308-4877073',
    publicWhatsappNumber: '0308-4877073',
    emergencyContact: '0303-2213806',
    smsContact: '0308-4877073',
    fax: '',
    email: 'royalstudio089@gmail.com',
    secondaryEmail: 'bookings@royalstudio.online',
    bookingEmail: 'royalstudio089@gmail.com',
    accountsEmail: 'royalstudio089@gmail.com',
    supportEmail: 'royalstudio089@gmail.com',
    notificationEmail: 'royalstudio089@gmail.com',
    emailDisplayName: 'Royal Studio Official',
    emailSignature: 'Royal Studio — We Capture Your Memories! | Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala | 0308-4877073',
    website: 'https://royalstudio.online',

    // 4. Social Media Accounts
    facebook: 'https://www.facebook.com/royalstudio089',
    instagram: 'https://www.instagram.com/royalstudio089',
    youtube: 'https://www.youtube.com/@royalstudio089',
    tiktok: 'https://www.tiktok.com/@royalstudio089',
    linkedin: '',
    pinterest: '',
    twitter: '',
    customSocialLinks: [],

    // 5. Branding & Logos
    logo: '/RoyalLogo.png',
    primaryLogo: '/RoyalLogo.png',
    secondaryLogo: '/RoyalLogo.png',
    lightLogo: '/RoyalLogo.png',
    darkLogo: '/RoyalLogo.png',
    documentLogo: '/RoyalLogo.png',
    websiteLogo: '/RoyalLogo.png',
    favicon: '/icon.png',
    appIcon: '/apple-icon.png',
    stampImage: '',
    signatureImage: '',
    emailHeaderLogo: '/RoyalLogo.png',
    socialProfileImage: '/RoyalLogo.png',
    socialCoverImage: '/image.png',

    // 6. Document Branding & Stationery
    documentBackground: '/01.jpg',
    quotationBackground: '/01.jpg',
    invoiceBackground: '/01.jpg',
    receiptBackground: '/01.jpg',
    documentShowBackground: true,
    documentBackgroundFit: 'as-is',
    documentBackgroundOpacity: 100,
    documentPageFillColor: '#efece4',
    documentShowHeaderLogo: true,
    documentHeaderLogoHeight: 16,
    documentAccentColor: '#a58137',
    documentTableStyle: 'transparent',
    letterheadText: 'ROYAL STUDIO — PHOTOGRAPHY & FILMS',
    documentFooterText: 'Thank you for choosing Royal Studio. We Capture Your Memories!',
    defaultTermsAndConditions:
      '50% advance deposit required upon contract confirmation to lock dates, camera crew, and equipment. Balance payable before final delivery. Edited highlight reels and albums delivered within 15-20 working days.',
    defaultInvoiceTerms:
      '50% Advance at booking, 30% on main event date, 20% on final deliverable handover. Unedited raw 4K cinema footage remains studio property until full account settlement.',
    defaultQuotationTerms:
      '50% advance required upon contract signing to lock crew and date. Quotation valid for 30 days from issue date.',

    // 7. Business Hours
    businessHours: [
      { day: 'Monday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
      { day: 'Tuesday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
      { day: 'Wednesday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
      { day: 'Thursday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
      { day: 'Friday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Jummah break 13:00–14:30' },
      { day: 'Saturday', openTime: '10:00', closeTime: '22:00', isClosed: false, note: 'Peak wedding consultations' },
      { day: 'Sunday', openTime: '12:00', closeTime: '20:00', isClosed: false, note: 'By appointment & event coverage' }
    ],
    holidayNotice: '',
    specialOpeningHours: 'Available 24/7 for scheduled wedding & event coverage across Pakistan.',
    temporaryClosure: false,

    // 8. Currency & Business Settings
    currency: 'PKR',
    currencySymbol: 'Rs.',
    taxRate: 5,
    taxEnabled: true,
    defaultDiscount: 0,
    quotationPrefix: 'RS-QUO-',
    invoicePrefix: 'RS-INV-',
    paymentTerms: '50% Advance at booking, 30% on main event date, 20% on final deliverable handover.',

    // 9. Bank Accounts & Payment Methods
    bankName: 'Meezan Bank Ltd',
    accountTitle: 'Royal Studio',
    accountNumber: '02010103456789',
    iban: 'PK45MEZN0002010103456789',
    bankAccounts: [
      {
        id: 'bank-001',
        accountName: 'Primary Studio Corporate Account',
        bankName: 'Meezan Bank Ltd',
        accountTitle: 'Royal Studio',
        accountNumber: '02010103456789',
        iban: 'PK45MEZN0002010103456789',
        branch: 'Burewala Main Branch',
        branchCode: '0201',
        swiftBic: 'MEZNPKKA',
        currency: 'PKR',
        accountType: 'Current',
        accountPurpose: 'Client Payments',
        isActive: true,
        isDefault: true,
        showPublicly: true,
        notes: 'Primary account for wedding booking advances and invoice settlements.'
      }
    ],
    paymentMethods: [
      {
        id: 'pm-001',
        methodName: 'Bank Transfer',
        displayName: 'Bank Wire / IBFT (Meezan Bank)',
        accountNumber: 'PK45MEZN0002010103456789',
        instructions: 'Transfer via IBFT or Raast to Royal Studio Meezan Bank account and share receipt on WhatsApp (0308-4877073).',
        isActive: true,
        showPublicly: true
      },
      {
        id: 'pm-002',
        methodName: 'JazzCash',
        displayName: 'JazzCash Mobile Wallet',
        accountNumber: '0308-4877073',
        instructions: 'Send payment to JazzCash account 0308-4877073 (Royal Studio).',
        isActive: true,
        showPublicly: true
      },
      {
        id: 'pm-003',
        methodName: 'EasyPaisa',
        displayName: 'EasyPaisa Mobile Wallet',
        accountNumber: '0308-4877073',
        instructions: 'Send payment to EasyPaisa account 0308-4877073 (Royal Studio).',
        isActive: true,
        showPublicly: true
      },
      {
        id: 'pm-004',
        methodName: 'Cash',
        displayName: 'In-Studio Cash Payment (Burewala)',
        accountNumber: '',
        instructions: 'Pay in cash at Royal Studio, Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala.',
        isActive: true,
        showPublicly: true
      }
    ],

    // 10. Tax & Legal Business Information
    taxId: 'NTN-RS-61010',
    ntn: '8492014-7',
    strn: '3277876123456',
    businessRegistrationNumber: 'BR-BWL-2018-089',
    registeredAddress: 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan',
    invoiceLegalFooter: 'All prices are in Pakistani Rupees (PKR). Official tax invoice issued by Royal Studio, Burewala.',
    legalTerms: 'Booking dates are reserved strictly upon receipt of 50% advance payment.',
    privacyPolicy: 'Client photographs and films are stored securely and shared publicly only in accordance with client preferences.',
    termsOfService: 'Standard coverage hours, deliverables, and timelines are governed by the signed event booking agreement.',
    refundPolicy: 'Advance booking deposits lock dates and production crew and are non-refundable, but may be adjusted toward rescheduled dates subject to availability.',
    cancellationPolicy: 'Cancellations must be communicated in writing at least 14 days prior to the scheduled event date.',

    // 11. Website / Public Profile Settings
    publicStudioName: 'Royal Studio',
    websiteTitle: 'Royal Studio | Luxury Wedding Photography Pakistan',
    websiteDescription: 'Luxury wedding photography and cinematic filmmaking across Pakistan. 3000+ weddings documented with timeless artistry since 2018.',
    seoTitle: 'Royal Studio — Luxury Wedding Photography & Cinematic Films in Burewala, Pakistan',
    seoDescription: 'Contact Royal Studio at Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala (0308-4877073) for luxury wedding photography & films.',
    openGraphImage: '/logo.png',
    showBusinessHoursPublicly: true,
    showPublicPriceBreakdown: false,

    // 12. Unified Theme & Appearance Customization (Admin ERP & Public Website)
    themeConfig: {
      mode: 'light',
      presetId: 'royal-champagne',
      accentColor: '#c9a76a',
      accentLight: '#d4b87a',
      accentDark: '#b08f4f',
      primaryColor: '#111111',
      backgroundLight: '#f8f8f8',
      surfaceLight: '#ffffff',
      backgroundDark: '#0d0d0d',
      surfaceDark: '#161616',
      sidebarStyle: 'obsidian',
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Inter',
      borderRadius: 'editorial',
      applyToPublicWebsite: true
    },

    notificationPreferences: {
      overdueInvoices: true,
      urgentTasks: true,
      equipmentMaintenance: true,
      lowAvailability: true
    }
  };
}

function getInitialData(): DatabaseSchema {
  const adminUser: User = {
    id: 'usr-admin',
    name: 'Royal Studio',
    email: 'admin@royalstudio.online',
    role: 'ADMIN',
    status: 'ACTIVE',
    phone: '+92 308 4877073',
    password: hashPassword('admin123'),
    avatar: '/RoyalLogo.png',
    createdDate: '2026-01-01T00:00:00.000Z'
  };

  const profile: AdminProfile = getDefaultStudioProfile();

  const clients: Client[] = [];

  const packages: Package[] = [
    {
      id: 'pkg-001',
      name: 'Royal 3-Day Wedding (Signature)',
      category: 'Wedding',
      description: 'Comprehensive 3-day coverage (Mehndi, Barat, Walima) with multi-cam cinema and aerial drone.',
      price: 370000,
      duration: '3 Days',
      requiredPhotographers: 2,
      requiredVideographers: 2,
      requiredDroneOperators: 1,
      requiredAssistants: 1,
      includedServices: [
        '2 Senior Candid Photographers',
        '2 4K Cinematic Videographers',
        '1 Licensed Drone Pilot',
        '1 Studio Lighting Tech',
        'Color grading & Master edits',
        'Traditional & candid coverage'
      ],
      deliverables: [
        'Luxury Leather Bound Storybook Album (50 pages)',
        '2 Parent Albums',
        'Full 4K Cinematic Highlight Film (5-7 mins)',
        'Full Length Documentary Video (45-60 mins)',
        '3 Instagram Reels / Teasers within 48 hours',
        'All raw & edited high-res digital photos on wooden USB box'
      ],
      isActive: true
    },
    {
      id: 'pkg-002',
      name: 'Standard Single-Day Wedding',
      category: 'Wedding',
      description: 'Full day coverage for Barat or Walima with dual photography and cinematic film.',
      price: 130000,
      duration: '8 Hours',
      requiredPhotographers: 2,
      requiredVideographers: 1,
      requiredDroneOperators: 0,
      requiredAssistants: 1,
      includedServices: [
        '2 Photographers (Candid + Stage)',
        '1 Cinema Videographer',
        '1 Lighting Assistant'
      ],
      deliverables: [
        '1 Premium Flushmount Album (35 pages)',
        'Cinematic Highlight (3-4 mins)',
        'High-res photo gallery with online cloud backup'
      ],
      isActive: true
    },
    {
      id: 'pkg-003',
      name: 'Nikah / Engagement Elegance',
      category: 'Nikah',
      description: 'Intimate ceremony coverage with fine-art portraits.',
      price: 75000,
      duration: '5 Hours',
      requiredPhotographers: 1,
      requiredVideographers: 1,
      requiredDroneOperators: 0,
      requiredAssistants: 1,
      includedServices: ['1 Fine-art Photographer', '1 4K Videographer'],
      deliverables: ['1 Contemporary Album', '3 min Highlight Video', 'Online gallery'],
      isActive: true
    },
    {
      id: 'pkg-004',
      name: 'Corporate Summit & Gala',
      category: 'Corporate',
      description: 'Professional event coverage for conventions, launches, and annual dinners.',
      price: 85000,
      duration: '6 Hours',
      requiredPhotographers: 2,
      requiredVideographers: 1,
      requiredDroneOperators: 0,
      requiredAssistants: 0,
      includedServices: ['Keynote coverage', 'Attendee candid portraits', 'Executive step & repeat'],
      deliverables: ['Same-day press photos', '1 Event Recap Video (2 mins)', 'All processed digital photos'],
      isActive: true
    },
    {
      id: 'pkg-005',
      name: 'Studio Portrait & Commercial Shoot',
      category: 'Other',
      description: 'Controlled studio lights session for fashion, brands, or family portraits.',
      price: 45000,
      duration: '4 Hours',
      requiredPhotographers: 1,
      requiredVideographers: 0,
      requiredDroneOperators: 0,
      requiredAssistants: 1,
      includedServices: ['Master Studio Lighting setup', 'Live tethered monitor review'],
      deliverables: ['25 High-end retouched magazine style frames', 'High-res exports'],
      isActive: true
    }
  ];

  const teamMembers: TeamMember[] = [];

  const equipment: Equipment[] = [
    {
      id: 'eq-001',
      name: 'Sony Alpha 7 IV Full-Frame Camera',
      category: 'Camera',
      brand: 'Sony',
      model: 'ILCE-7M4',
      serialNumber: 'SN-SNY-9901',
      quantity: 2,
      status: 'Available',
      rentalRate: 5000,
      purchaseDate: '2023-04-12',
      serviceAfterUses: 20,
      currentUsageCount: 22, // Over service threshold -> Service Required warning!
      notes: 'Sensor cleaning and shutter maintenance due.'
    },
    {
      id: 'eq-002',
      name: 'Sony FX3 Cinema Line Camera',
      category: 'Camera',
      brand: 'Sony',
      model: 'ILME-FX3',
      serialNumber: 'SN-FX3-4412',
      quantity: 2,
      status: 'Available',
      rentalRate: 8000,
      purchaseDate: '2023-08-19',
      serviceAfterUses: 20,
      currentUsageCount: 14,
      notes: 'Firmware 4.0 updated with custom S-Cinetone LUTs.'
    },
    {
      id: 'eq-003',
      name: 'Sony FE 24-70mm f/2.8 GM II Lens',
      category: 'Lens',
      brand: 'Sony',
      model: 'SEL2470GM2',
      serialNumber: 'SN-GM-1123',
      quantity: 2,
      status: 'Available',
      rentalRate: 3500,
      purchaseDate: '2023-05-10',
      serviceAfterUses: 25,
      currentUsageCount: 16,
      notes: 'Crisp optics with B+W UV filter.'
    },
    {
      id: 'eq-004',
      name: 'Sony FE 70-200mm f/2.8 GM OSS II Lens',
      category: 'Lens',
      brand: 'Sony',
      model: 'SEL70200GM2',
      serialNumber: 'SN-GM-7788',
      quantity: 1,
      status: 'Available',
      rentalRate: 4500,
      purchaseDate: '2023-09-01',
      serviceAfterUses: 25,
      currentUsageCount: 11,
      notes: 'Ideal for stage candid and telephoto isolation.'
    },
    {
      id: 'eq-005',
      name: 'DJI Mavic 3 Cine Aerial Drone Kit',
      category: 'Drone',
      brand: 'DJI',
      model: 'Mavic 3 Cine (Apple ProRes)',
      serialNumber: 'SN-DJI-8821',
      quantity: 1,
      status: 'Available',
      rentalRate: 9000,
      purchaseDate: '2023-10-15',
      serviceAfterUses: 20,
      currentUsageCount: 9,
      notes: 'Includes 4 intelligent flight batteries and ND filters.'
    },
    {
      id: 'eq-006',
      name: 'Godox AD600 Pro Outdoor Strobe Kit',
      category: 'Light',
      brand: 'Godox',
      model: 'AD600Pro TTL',
      serialNumber: 'SN-GDX-3011',
      quantity: 2,
      status: 'Available',
      rentalRate: 4000,
      purchaseDate: '2023-03-22',
      serviceAfterUses: 30,
      currentUsageCount: 19,
      notes: 'Includes portable softboxes, heavy C-stands and XPro trigger.'
    },
    {
      id: 'eq-007',
      name: 'Rode Wireless PRO Dual Mic System',
      category: 'Audio',
      brand: 'Rode',
      model: 'Wireless PRO 32-bit Float',
      serialNumber: 'SN-ROD-5501',
      quantity: 2,
      status: 'Available',
      rentalRate: 2500,
      purchaseDate: '2024-02-05',
      serviceAfterUses: 30,
      currentUsageCount: 8,
      notes: 'Zero-clipping 32-bit float audio for groom and stage vows.'
    },
    {
      id: 'eq-008',
      name: 'DJI RS 3 Pro Gimbal Stabilizer',
      category: 'Gimbal',
      brand: 'DJI',
      model: 'RS3 Pro Combo',
      serialNumber: 'SN-DJI-2231',
      quantity: 2,
      status: 'Available',
      rentalRate: 3500,
      purchaseDate: '2023-11-12',
      serviceAfterUses: 25,
      currentUsageCount: 15,
      notes: 'With RavenEye image transmitter and focus motor.'
    }
  ];

  const maintenanceLogs: EquipmentMaintenanceLog[] = [];
  const daySchedules: EventDaySchedule[] = [];
  const teamAssignments: EventTeamAssignment[] = [];
  const equipmentAssignments: EventEquipmentAssignment[] = [];
  const eventExpenses: EventExpense[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const quotations: Quotation[] = [];
  const tasks: EventTask[] = [];
  const studioExpenses: StudioExpense[] = [];
  const teamPayments: TeamPayment[] = [];

  return {
    users: [adminUser],
    profile,
    clients,
    events: [],
    daySchedules,
    packages,
    teamMembers,
    teamAssignments,
    teamPayments,
    equipment,
    equipmentAssignments,
    maintenanceLogs,
    eventExpenses,
    studioExpenses,
    invoices,
    payments,
    quotations,
    tasks,
    tempHireRecommendations: []
  };
}

export function deriveDefaultPinForEvent(eventId: string): string {
  const presetMap: Record<string, string> = {
    'evt-001': '4821',
    'evt-002': '7392',
    'evt-003': '6154',
    'evt-004': '9048',
  };
  if (presetMap[eventId]) return presetMap[eventId];
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) % 9000;
  }
  const code = String(1000 + Math.abs(hash));
  return code === '1234' ? '5829' : code;
}

export function getDefaultProofingGalleryForEvent(eventId: string, title?: string) {
  const defaultPhotos = [
    {
      id: `${eventId}-prf-01`,
      url: '/portfolio/bridal-01-mirror-portrait.jpg',
      title: 'Crimson Bridal Signature Portrait — Royal Courtyard',
      dayLabel: 'Day 2 · Barat',
      category: 'Bridal Portrait',
      cameraUsed: 'Sony A7R V',
      lensUsed: '85mm f/1.4 GM II',
      isSelectedForAlbum: true,
      retouchingNote: 'Keep warm golden skin tones and highlight intricate zardozi embroidery on dupatta border.',
      selectedAt: '2026-10-01T14:20:00.000Z',
    },
    {
      id: `${eventId}-prf-02`,
      url: '/portfolio/couple-02-annum-ali-mehndi.jpg',
      title: 'Couple Grand Entrance — Chadar & Fireworks',
      dayLabel: 'Day 2 · Barat',
      category: 'Couple Portrait',
      cameraUsed: 'Sony A7 IV',
      lensUsed: '35mm f/1.4 GM',
      isSelectedForAlbum: true,
      retouchingNote: 'Full two-page panoramic center spread in album.',
      selectedAt: '2026-10-01T14:22:00.000Z',
    },
    {
      id: `${eventId}-prf-03`,
      url: '/portfolio/mehndi-01-chishtiya-taj-palace.jpg',
      title: 'Mehndi Rasam & Dholak Candid Celebration',
      dayLabel: 'Day 1 · Mehndi',
      category: 'Mehndi Candid',
      cameraUsed: 'Sony A7 IV',
      lensUsed: '24-70mm f/2.8 GM II',
      isSelectedForAlbum: true,
      retouchingNote: '',
      selectedAt: '2026-10-01T14:25:00.000Z',
    },
    {
      id: `${eventId}-prf-04`,
      url: '/portfolio/walima-01-reception-hall.jpg',
      title: 'Walima Pastel Elegance — Chandelier Hall',
      dayLabel: 'Day 3 · Walima',
      category: 'Walima Reception',
      cameraUsed: 'Sony A7R V',
      lensUsed: '50mm f/1.2 GM',
      isSelectedForAlbum: true,
      retouchingNote: 'Soften background chandelier glare slightly.',
      selectedAt: '2026-10-01T14:28:00.000Z',
    },
    {
      id: `${eventId}-prf-05`,
      url: '/portfolio/groom-01-amir-outdoor-ready.jpg',
      title: 'Groom Royal Sherwani & Turban Detail',
      dayLabel: 'Day 2 · Barat',
      category: 'Groom Portrait',
      cameraUsed: 'Sony A7R V',
      lensUsed: '85mm f/1.4 GM II',
      isSelectedForAlbum: false,
      retouchingNote: '',
    },
    {
      id: `${eventId}-prf-06`,
      url: '/portfolio/barat-02-groom-turban-moment.jpg',
      title: 'Barat Stage — Royal Couple & Floral Arch',
      dayLabel: 'Day 2 · Barat',
      category: 'Stage & Family',
      cameraUsed: 'Sony A7 IV',
      lensUsed: '24-70mm f/2.8 GM II',
      isSelectedForAlbum: true,
      retouchingNote: '',
      selectedAt: '2026-10-01T14:30:00.000Z',
    },
    {
      id: `${eventId}-prf-07`,
      url: '/portfolio/bridal-02-henna-hands.jpg',
      title: 'Fine-Art Bridal Jewelry & Henna Macro Detail',
      dayLabel: 'Day 2 · Barat',
      category: 'Details & Jewelry',
      cameraUsed: 'Sony A7R V',
      lensUsed: '90mm f/2.8 Macro G',
      isSelectedForAlbum: true,
      retouchingNote: 'Pair next to Crimson Bridal Portrait on opening page.',
      selectedAt: '2026-10-01T14:32:00.000Z',
    },
    {
      id: `${eventId}-prf-08`,
      url: '/portfolio/couple-01-pillars.jpg',
      title: 'Golden Hour Sunset Walk — Fairway Gardens',
      dayLabel: 'Day 3 · Walima',
      category: 'Couple Portrait',
      cameraUsed: 'Sony A7R V',
      lensUsed: '70-200mm f/2.8 GM II',
      isSelectedForAlbum: false,
      retouchingNote: '',
    },
    {
      id: `${eventId}-prf-09`,
      url: '/portfolio/mehndi-02-groom-arrival.jpg',
      title: 'Choreographed Family Dance Performance',
      dayLabel: 'Day 1 · Mehndi',
      category: 'Mehndi Candid',
      cameraUsed: 'Sony FX3 / A7 IV',
      lensUsed: '35mm f/1.4 GM',
      isSelectedForAlbum: false,
      retouchingNote: '',
    },
    {
      id: `${eventId}-prf-10`,
      url: '/portfolio/bridal-03-outdoor-tree.jpg',
      title: 'Editorial Outdoor Bridal Veil Silhouette',
      dayLabel: 'Day 3 · Walima',
      category: 'Bridal Portrait',
      cameraUsed: 'Sony A7R V',
      lensUsed: '85mm f/1.4 GM II',
      isSelectedForAlbum: true,
      retouchingNote: 'Convert duplicate copy to timeless black & white as well.',
      selectedAt: '2026-10-01T14:35:00.000Z',
    },
    {
      id: `${eventId}-prf-11`,
      url: '/portfolio/nikah-01-venue-setup.jpg',
      title: 'Sacred Nikah Nama Signing & Dua',
      dayLabel: 'Day 2 · Barat',
      category: 'Nikah Ceremony',
      cameraUsed: 'Sony A7 IV',
      lensUsed: '50mm f/1.2 GM',
      isSelectedForAlbum: true,
      retouchingNote: 'Must include on page 3 of the main Italian leather storybook.',
      selectedAt: '2026-10-01T14:38:00.000Z',
    },
    {
      id: `${eventId}-prf-12`,
      url: '/portfolio/walima-02-hall-decor.jpg',
      title: 'Architectural Floral Chandelier & Reception Table Styling',
      dayLabel: 'Day 3 · Walima',
      category: 'Decor & Venue',
      cameraUsed: 'Sony A7 IV',
      lensUsed: '16-35mm f/2.8 GM II',
      isSelectedForAlbum: false,
      retouchingNote: '',
    },
  ];

  return {
    pinCode: deriveDefaultPinForEvent(eventId),
    isPinProtected: false,
    isPublished: true,
    targetCountMin: 100,
    targetCountMax: 150,
    minAlbumSelection: 100,
    maxAlbumSelection: 150,
    selectionStatus: 'Open' as const,
    clientSubmissionNote: title ? `Luxury Storybook Album Selection for ${title}` : '',
    photos: defaultPhotos,
  };
}

export function extractYoutubePlaylistId(rawUrl: string): string {
  const input = (rawUrl || '').trim();
  if (!input) return '';
  const listMatch = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch && listMatch[1]) return listMatch[1];
  if (/^PL[a-zA-Z0-9_-]{10,}$/.test(input)) return input;
  return '';
}

export function buildDefaultMediaDeliveryVault(
  event: Event,
  client?: Client
): EventMediaDeliveryVault {
  const evtSlug = (event.id || 'evt-001').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const clientSlug = (client?.name || event.title || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 22);
  const pin = deriveDefaultPinForEvent(event.id);
  const googleAccountEmail = `royalstudio.${evtSlug}.${clientSlug}@gmail.com`;
  const googleAccountPassword = `RS#Drive2026!${pin}`;
  const folderHash = `1RS_${evtSlug.toUpperCase()}_${pin}x9K2mQvL8p`;
  const defaultDriveFolderUrl = `https://drive.google.com/drive/folders/${folderHash}?usp=sharing`;
  const driveFolderUrl =
    client?.mediaDelivery?.driveFolderUrl ||
    client?.googleDriveFolderUrl ||
    defaultDriveFolderUrl;
  const nowIso = event.updatedDate || event.createdDate || new Date().toISOString();

  const isCorporate = event.category === 'Corporate';
  const defaultSubfolders = isCorporate
    ? [
        {
          id: `${event.id}-gdf-01`,
          folderName: '01 · High-Resolution Keynote & Press Gallery (JPEG)',
          folderType: 'High-Res Edited',
          folderUrl: `${driveFolderUrl}&folder=01-highres-press`,
          driveUrl: `${driveFolderUrl}&folder=01-highres-press`,
          fileCount: 640,
          sizeGb: 4.2,
          transferStatus: 'Verified' as const,
          status: 'Synced',
          updatedAt: nowIso,
          uploadedAt: nowIso,
        },
        {
          id: `${event.id}-gdf-02`,
          folderName: '02 · Uncompressed Master RAW Camera Archives (Sony ARW)',
          folderType: 'RAW Archive',
          folderUrl: `${driveFolderUrl}&folder=02-raw-masters`,
          driveUrl: `${driveFolderUrl}&folder=02-raw-masters`,
          fileCount: 920,
          sizeGb: 7.4,
          transferStatus: 'Transferred' as const,
          status: 'Synced',
          updatedAt: nowIso,
          uploadedAt: nowIso,
        },
      ]
    : [
        {
          id: `${event.id}-gdf-01`,
          folderName: '01 · Master High-Resolution Edited Gallery (300 DPI JPEG)',
          folderType: 'High-Res Edited',
          folderUrl: `${driveFolderUrl}&folder=01-edited-highres`,
          driveUrl: `${driveFolderUrl}&folder=01-edited-highres`,
          fileCount: 950,
          sizeGb: 4.8,
          transferStatus: 'Verified' as const,
          status: 'Synced',
          updatedAt: nowIso,
          uploadedAt: nowIso,
        },
        {
          id: `${event.id}-gdf-02`,
          folderName: '02 · Multi-Day Uncompressed RAW Camera Archives (ARW / CR3)',
          folderType: 'RAW Archive',
          folderUrl: `${driveFolderUrl}&folder=02-raw-masters`,
          driveUrl: `${driveFolderUrl}&folder=02-raw-masters`,
          fileCount: 1420,
          sizeGb: 7.1,
          transferStatus: 'Transferred' as const,
          status: 'Synced',
          updatedAt: nowIso,
          uploadedAt: nowIso,
        },
        {
          id: `${event.id}-gdf-03`,
          folderName: '03 · Luxury Italian Storybook Album Spreads (Print Master)',
          folderType: 'Album Print Ready',
          folderUrl: `${driveFolderUrl}&folder=03-album-spreads`,
          driveUrl: `${driveFolderUrl}&folder=03-album-spreads`,
          fileCount: 50,
          sizeGb: 1.2,
          transferStatus: 'Verified' as const,
          status: 'Synced',
          updatedAt: nowIso,
          uploadedAt: nowIso,
        },
      ];

  const subfolders =
    client?.mediaDelivery?.driveSubfolders &&
    client.mediaDelivery.driveSubfolders.length > 0
      ? client.mediaDelivery.driveSubfolders.map((f) => ({
          ...f,
          folderUrl: f.folderUrl || f.driveUrl || driveFolderUrl,
          driveUrl: f.driveUrl || f.folderUrl || driveFolderUrl,
          folderType: f.folderType || 'High-Res Edited',
          transferStatus: f.transferStatus || 'Verified',
          updatedAt: f.updatedAt || f.uploadedAt || nowIso,
        }))
      : defaultSubfolders;

  const totalGb =
    client?.mediaDelivery?.totalDataVolumeGb ||
    Number(
      subfolders.reduce((sum, f) => sum + Number(f.sizeGb || 0), 0).toFixed(1)
    );
  const totalPhotos = subfolders.reduce((sum, f) => sum + Number(f.fileCount || 0), 0);

  const defaultUnlistedVideos = [
    {
      id: `${event.id}-yt-01`,
      title: `${event.title} — Official 4K Wedding Highlight Teaser`,
      videoType: 'Teaser' as const,
      youtubeId: 'QF3BmojTrKQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=QF3BmojTrKQ',
      duration: '03:37',
      resolution: '4K UHD' as const,
      privacyStatus: 'Unlisted' as const,
      uploadedAt: nowIso,
    },
    {
      id: `${event.id}-yt-02`,
      title: `${event.title} — Vibrant Mehndi Night Full Coverage Reel`,
      videoType: 'Mehndi Coverage' as const,
      youtubeId: 'UgG6hsk5AU8',
      youtubeUrl: 'https://www.youtube.com/watch?v=UgG6hsk5AU8',
      duration: '28:26',
      resolution: '4K UHD' as const,
      privacyStatus: 'Unlisted' as const,
      uploadedAt: nowIso,
    },
    {
      id: `${event.id}-yt-03`,
      title: `${event.title} — Barat Procession & Royal Nikah Cinema Film`,
      videoType: 'Barat Coverage' as const,
      youtubeId: 'wF_5efX_Kwo',
      youtubeUrl: 'https://www.youtube.com/watch?v=wF_5efX_Kwo',
      duration: '42:15',
      resolution: '4K UHD' as const,
      privacyStatus: 'Unlisted' as const,
      uploadedAt: nowIso,
    },
    {
      id: `${event.id}-yt-04`,
      title: `${event.title} — Walima Reception & Aerial Drone Finale`,
      videoType: 'Walima Coverage' as const,
      youtubeId: 'IHpGkLHnmpU',
      youtubeUrl: 'https://www.youtube.com/watch?v=IHpGkLHnmpU',
      duration: '36:50',
      resolution: '4K UHD' as const,
      privacyStatus: 'Unlisted' as const,
      uploadedAt: nowIso,
    },
  ];

  const unlistedVideos =
    client?.mediaDelivery?.unlistedVideos &&
    client.mediaDelivery.unlistedVideos.length > 0
      ? client.mediaDelivery.unlistedVideos
      : defaultUnlistedVideos;

  const playlistId = `PLRoyalStudio_${evtSlug.toUpperCase()}_${pin}`;
  const youtubePlaylistUrl =
    client?.mediaDelivery?.youtubePlaylistUrl ||
    client?.youtubePlaylistUrl ||
    `https://www.youtube.com/watch?v=QF3BmojTrKQ&list=${playlistId}`;

  const adminCredentials: AdminOnlyGoogleDriveCredentials = {
    googleAccountEmail,
    googleAccountPassword,
    recoveryEmail: 'royalstudio089@gmail.com',
    recoveryPhone: '0308-4877073',
    allocatedQuotaGb: 15,
    usedStorageGb: totalGb,
    provisionedAt: nowIso,
    provisionedBy: 'Royal Studio Admin (Auto-Provisioned)',
    adminInternalNotes: `Dedicated 15GB Free-Tier Google Drive account provisioned for ${client?.name || event.title}. Zero recurring cloud storage cost.`,
  };

  return {
    approvalStatus:
      event.status === 'Delivered' || event.status === 'Completed'
        ? 'Delivered'
        : 'Approved & Provisioned',
    approvedAt: nowIso,
    approvedBy: 'Royal Studio Admin',
    driveFolderUrl,
    driveFolderId: folderHash,
    driveFolderName:
      client?.mediaDelivery?.driveFolderName ||
      `Royal Studio · ${event.title} (${totalGb} GB High-Res Archive)`,
    totalDataVolumeGb: totalGb,
    freeTierQuotaGb: 15,
    totalHighResPhotos: totalPhotos,
    rawAssetsIncluded: true,
    driveTransferProgress: 100,
    driveSubfolders: subfolders,
    adminOnlyDriveCredentials: adminCredentials,
    youtubePlaylistUrl,
    youtubePlaylistId: extractYoutubePlaylistId(youtubePlaylistUrl) || playlistId,
    youtubePlaylistTitle:
      client?.mediaDelivery?.youtubePlaylistTitle ||
      `${event.title} — Unlisted 4K Wedding Films Playlist`,
    youtubePrivacyMode: 'Unlisted Playlist & Videos',
    unlistedVideos,
    clientDeliveryNotes:
      'Stream your 4K Unlisted Wedding Films directly below or open your dedicated 15GB Google Drive folder to download full-resolution master photos & RAW archives.',
    lastUpdatedAt: nowIso,
  };
}

export function syncEventMediaDeliveryToClientProfile(
  event: Event,
  clients: Client[]
): boolean {
  if (!event?.mediaDelivery) return false;
  const client = clients.find(c => c.id === event.clientId);
  if (!client) return false;

  let changed = false;
  if (
    event.mediaDelivery.driveFolderUrl &&
    client.googleDriveFolderUrl !== event.mediaDelivery.driveFolderUrl
  ) {
    client.googleDriveFolderUrl = event.mediaDelivery.driveFolderUrl;
    changed = true;
  }
  if (
    event.mediaDelivery.youtubePlaylistUrl &&
    client.youtubePlaylistUrl !== event.mediaDelivery.youtubePlaylistUrl
  ) {
    client.youtubePlaylistUrl = event.mediaDelivery.youtubePlaylistUrl;
    changed = true;
  }

  const { adminOnlyDriveCredentials: _cred, ...safeVault } = event.mediaDelivery;
  if (!client.mediaDelivery) {
    client.mediaDelivery = safeVault;
    changed = true;
  } else if (
    client.mediaDelivery.driveFolderUrl !== safeVault.driveFolderUrl ||
    client.mediaDelivery.youtubePlaylistUrl !== safeVault.youtubePlaylistUrl ||
    (safeVault.driveSubfolders?.length || 0) !==
      (client.mediaDelivery.driveSubfolders?.length || 0) ||
    (safeVault.unlistedVideos?.length || 0) !==
      (client.mediaDelivery.unlistedVideos?.length || 0)
  ) {
    client.mediaDelivery = safeVault;
    changed = true;
  }

  const creds = event.mediaDelivery.adminOnlyDriveCredentials;
  if (creds) {
    if (!Array.isArray(client.adminOnlyDriveAccounts)) {
      client.adminOnlyDriveAccounts = [];
      changed = true;
    }
    const existingIdx = client.adminOnlyDriveAccounts.findIndex(
      a => a.eventId === event.id
    );
    const nextRecord = {
      ...creds,
      eventId: event.id,
      eventTitle: event.title,
      driveFolderUrl: event.mediaDelivery.driveFolderUrl,
    };
    if (existingIdx === -1) {
      client.adminOnlyDriveAccounts.unshift(nextRecord);
      changed = true;
    } else if (
      JSON.stringify(client.adminOnlyDriveAccounts[existingIdx]) !==
      JSON.stringify(nextRecord)
    ) {
      client.adminOnlyDriveAccounts[existingIdx] = nextRecord;
      changed = true;
    }
  }
  return changed;
}

/**
 * Strips strictly Admin-only Google Drive account credentials and internal studio financials
 * before sending an Event object to any Customer / Client Portal or Staff endpoint.
 */
export function sanitizeEventForClient<T extends Partial<Event>>(event: T): T {
  if (!event) return event;
  const cloned: any = {
    ...event,
    staffCost: 0,
    rentalCost: 0,
    eventExpenses: 0,
    netProfit: 0,
    netMargin: 0,
  };
  if (cloned.mediaDelivery) {
    const { adminOnlyDriveCredentials: _redacted, ...safeMediaDelivery } =
      cloned.mediaDelivery;
    cloned.mediaDelivery = safeMediaDelivery;
  }
  return cloned;
}

/**
 * Strips strictly Admin-only Google Drive account credentials (`adminOnlyDriveAccounts`)
 * before sending a Client profile object to any Customer / Client Portal endpoint.
 */
export function sanitizeClientForClientPortal<T extends Partial<Client>>(
  client: T
): T {
  if (!client) return client;
  const { adminOnlyDriveAccounts: _redacted, ...safeClient } = client as any;
  if (safeClient.mediaDelivery) {
    const { adminOnlyDriveCredentials: _cred, ...safeMd } = safeClient.mediaDelivery;
    safeClient.mediaDelivery = safeMd;
  }
  return safeClient as T;
}

export class StudioDatabase {
  private db: DatabaseSchema;
  private hydratedFromCloud = false;
  private hydrationPromise: Promise<DatabaseSchema> | null = null;

  constructor() {
    this.db = getInitialData();
    this.normalizeSchemaDefaults();
  }

  public async ensureHydrated(): Promise<DatabaseSchema> {
    if (this.hydratedFromCloud) {
      return this.db;
    }
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }

    this.hydrationPromise = (async () => {
      try {
        const adapter = getDatabaseAdapter<DatabaseSchema>();
        const remoteData = await adapter.readAsync();
        if (remoteData) {
          this.db = {
            ...this.db,
            ...remoteData,
          };
          const changed = this.normalizeSchemaDefaults();
          this.hydratedFromCloud = true;
          if (changed) {
            await adapter.writeAsync(this.db);
          }
        } else {
          this.normalizeSchemaDefaults();
          this.hydratedFromCloud = true;
          await adapter.writeAsync(this.db);
        }
      } catch (err) {
        console.error('[StudioDatabase] Firestore hydration warning:', err);
        this.hydratedFromCloud = true;
      } finally {
        this.hydrationPromise = null;
      }
      return this.db;
    })();

    return this.hydrationPromise;
  }

  private normalizeSchemaDefaults(): boolean {
    let needsSave = false;

    // 1. Purge any legacy dummy user accounts (usr-client, usr-staff, tariq.mehmood@example.com, etc.)
    const DUMMY_USER_IDS = new Set(['usr-staff', 'usr-client']);
    const DUMMY_USER_EMAILS = new Set([
      'staff@royalstudio.pk',
      'admin@royalstudio.pk',
      'tariq.mehmood@example.com',
      'ayesha.siddiqui@example.pk',
      'omer.sheikh@example.com',
    ]);

    const existingAdmin = this.db.users?.find(u => u.role === 'ADMIN');
    const hasDummyOrClientUsers = this.db.users?.some(
      u =>
        DUMMY_USER_IDS.has(u.id) ||
        DUMMY_USER_EMAILS.has(u.email?.toLowerCase() || '') ||
        (u.role as string) === 'CLIENT'
    );

    if (
      !existingAdmin ||
      existingAdmin.email !== 'admin@royalstudio.online' ||
      !verifyPassword('admin123', existingAdmin.password) ||
      hasDummyOrClientUsers
    ) {
      const validPassHash =
        existingAdmin && verifyPassword('admin123', existingAdmin.password)
          ? existingAdmin.password
          : hashPassword('admin123');

      const preservedStaffUsers = (this.db.users || []).filter(
        u =>
          u.role === 'STAFF' &&
          !DUMMY_USER_IDS.has(u.id) &&
          !DUMMY_USER_EMAILS.has(u.email?.toLowerCase() || '')
      );

      this.db.users = [
        {
          id: 'usr-admin',
          name: 'Royal Studio',
          email: 'admin@royalstudio.online',
          role: 'ADMIN',
          status: 'ACTIVE',
          phone: '+92 308 4877073',
          password: validPassHash,
          avatar: '/RoyalLogo.png',
          createdDate: '2026-01-01T00:00:00.000Z',
        },
        ...preservedStaffUsers,
      ];
      needsSave = true;
    }

    // 2. Purge any legacy seeded dummy clients, events, team members, studio expenses, invoices, quotations, payments, and tasks
    const DUMMY_CLIENT_IDS = new Set(['cli-001', 'cli-002', 'cli-003', 'cli-004', 'cli-005']);
    const DUMMY_EVENT_IDS = new Set(['evt-001', 'evt-002', 'evt-003']);
    const DUMMY_TEAM_IDS = new Set(['tm-001', 'tm-002', 'tm-003', 'tm-004', 'tm-005', 'tm-006', 'tm-007', 'tm-008']);
    const DUMMY_STUDIO_EXPENSE_IDS = new Set(['sexp-001', 'sexp-002', 'sexp-003', 'sexp-004']);
    const DUMMY_TEAM_PAYMENT_IDS = new Set(['tp-001', 'tp-002']);
    const DUMMY_MAINTENANCE_IDS = new Set(['mnt-001']);

    if (this.db.clients?.some(c => DUMMY_CLIENT_IDS.has(c.id))) {
      this.db.clients = this.db.clients.filter(c => !DUMMY_CLIENT_IDS.has(c.id));
      needsSave = true;
    }
    if (this.db.events?.some(e => DUMMY_EVENT_IDS.has(e.id))) {
      this.db.events = this.db.events.filter(e => !DUMMY_EVENT_IDS.has(e.id));
      this.db.daySchedules = (this.db.daySchedules || []).filter(d => !DUMMY_EVENT_IDS.has(d.eventId));
      this.db.teamAssignments = (this.db.teamAssignments || []).filter(t => !DUMMY_EVENT_IDS.has(t.eventId));
      this.db.equipmentAssignments = (this.db.equipmentAssignments || []).filter(eq => !DUMMY_EVENT_IDS.has(eq.eventId));
      this.db.eventExpenses = (this.db.eventExpenses || []).filter(ex => !DUMMY_EVENT_IDS.has(ex.eventId));
      this.db.invoices = (this.db.invoices || []).filter(inv => !DUMMY_EVENT_IDS.has(inv.eventId));
      this.db.payments = (this.db.payments || []).filter(p => !DUMMY_EVENT_IDS.has(p.eventId));
      this.db.quotations = (this.db.quotations || []).filter(q => !DUMMY_EVENT_IDS.has(q.eventId));
      this.db.tasks = (this.db.tasks || []).filter(t => !DUMMY_EVENT_IDS.has(t.eventId));
      this.db.teamPayments = (this.db.teamPayments || []).filter(tp => !tp.eventId || !DUMMY_EVENT_IDS.has(tp.eventId));
      needsSave = true;
    }
    if (this.db.teamMembers?.some(tm => DUMMY_TEAM_IDS.has(tm.id))) {
      this.db.teamMembers = this.db.teamMembers.filter(tm => !DUMMY_TEAM_IDS.has(tm.id));
      needsSave = true;
    }
    if (this.db.studioExpenses?.some(se => DUMMY_STUDIO_EXPENSE_IDS.has(se.id))) {
      this.db.studioExpenses = this.db.studioExpenses.filter(se => !DUMMY_STUDIO_EXPENSE_IDS.has(se.id));
      needsSave = true;
    }
    if (this.db.teamPayments?.some(tp => DUMMY_TEAM_PAYMENT_IDS.has(tp.id))) {
      this.db.teamPayments = this.db.teamPayments.filter(tp => !DUMMY_TEAM_PAYMENT_IDS.has(tp.id));
      needsSave = true;
    }
    if (this.db.maintenanceLogs?.some(ml => DUMMY_MAINTENANCE_IDS.has(ml.id))) {
      this.db.maintenanceLogs = this.db.maintenanceLogs.filter(ml => !DUMMY_MAINTENANCE_IDS.has(ml.id));
      needsSave = true;
    }

    // Sync team member login status with user accounts
    this.db.teamMembers?.forEach(tm => {
      const linkedUser = this.db.users?.find(u => u.linkedTeamMemberId === tm.id || u.id === tm.userId);
      if (linkedUser) {
        if (!tm.hasLogin || tm.userId !== linkedUser.id || tm.loginStatus !== linkedUser.status) {
          tm.hasLogin = true;
          tm.userId = linkedUser.id;
          tm.loginStatus = linkedUser.status;
          needsSave = true;
        }
      } else {
        if (tm.hasLogin || tm.userId || tm.loginStatus) {
          tm.hasLogin = false;
          delete tm.userId;
          delete tm.loginStatus;
          needsSave = true;
        }
      }
    });

    // Sync client portal login flags (clients access /client-portal via password)
    this.db.clients?.forEach(c => {
      if (c.userId) {
        delete c.userId;
        needsSave = true;
      }
      const hasPass = Boolean(c.portalPassword && c.portalPassword.trim());
      if (c.loginStatus === 'NONE' || c.hasLogin === false || !hasPass) {
        if (c.hasLogin !== false || c.loginStatus !== 'NONE' || hasPass) {
          c.hasLogin = false;
          c.loginStatus = 'NONE';
          c.portalPassword = '';
          needsSave = true;
        }
      } else {
        if (c.hasLogin !== true) {
          c.hasLogin = true;
          needsSave = true;
        }
        if (c.loginStatus !== 'ACTIVE' && c.loginStatus !== 'DISABLED') {
          c.loginStatus = 'ACTIVE';
          needsSave = true;
        }
      }
      if (c.mediaDelivery && Array.isArray(c.mediaDelivery.driveSubfolders)) {
        c.mediaDelivery.driveSubfolders = c.mediaDelivery.driveSubfolders.map(f => ({
          ...f,
          folderUrl: f.folderUrl || f.driveUrl || c.mediaDelivery?.driveFolderUrl || '',
          driveUrl: f.driveUrl || f.folderUrl || c.mediaDelivery?.driveFolderUrl || '',
          folderType: f.folderType || 'High-Res Edited',
          transferStatus: f.transferStatus || 'Verified',
          updatedAt: f.updatedAt || f.uploadedAt || c.createdDate,
        }));
      }
    });

    // Ensure every payment has a valid clientId linked from its parent event
    this.db.payments?.forEach(p => {
      if (!p.clientId && p.eventId) {
        const parentEvt = this.db.events?.find(e => e.id === p.eventId);
        if (parentEvt?.clientId) {
          p.clientId = parentEvt.clientId;
          needsSave = true;
        }
      }
    });

    // Deduplicate daySchedules by id and by eventId + dayNumber
    if (Array.isArray(this.db.daySchedules)) {
      const seenDsId = new Set<string>();
      const seenDsKey = new Set<string>();
      const dedupedDs: EventDaySchedule[] = [];
      for (const ds of this.db.daySchedules) {
        const key = `${ds.eventId}-d${ds.dayNumber}`;
        if (!seenDsId.has(ds.id) && !seenDsKey.has(key)) {
          seenDsId.add(ds.id);
          seenDsKey.add(key);
          dedupedDs.push(ds);
        } else {
          needsSave = true;
        }
      }
      this.db.daySchedules = dedupedDs;
    }

    // Deduplicate quotations by id and by eventId (keep latest/approved)
    if (Array.isArray(this.db.quotations)) {
      const seenQuoId = new Set<string>();
      const seenQuoEvent = new Set<string>();
      const dedupedQuo: Quotation[] = [];
      for (const q of this.db.quotations) {
        const evKey = q.eventId ? `evt-${q.eventId}` : `quo-${q.id}`;
        if (!seenQuoId.has(q.id) && !seenQuoEvent.has(evKey)) {
          seenQuoId.add(q.id);
          seenQuoEvent.add(evKey);
          dedupedQuo.push(q);
        } else {
          needsSave = true;
        }
      }
      this.db.quotations = dedupedQuo;
    }

    // Deduplicate invoices by id and by eventId
    if (Array.isArray(this.db.invoices)) {
      const seenInvId = new Set<string>();
      const seenInvEvent = new Set<string>();
      const dedupedInv: Invoice[] = [];
      for (const inv of this.db.invoices) {
        const evKey = inv.eventId ? `evt-${inv.eventId}` : `inv-${inv.id}`;
        if (!seenInvId.has(inv.id) && !seenInvEvent.has(evKey)) {
          seenInvId.add(inv.id);
          seenInvEvent.add(evKey);
          dedupedInv.push(inv);
        } else {
          needsSave = true;
        }
      }
      this.db.invoices = dedupedInv;
    }

    // Deduplicate payments by id and by eventId + amount + reference
    if (Array.isArray(this.db.payments)) {
      const seenPayId = new Set<string>();
      const seenPayKey = new Set<string>();
      const dedupedPay: Payment[] = [];
      for (const p of this.db.payments) {
        const refKey = p.reference ? `${p.eventId}-${p.amount}-${p.reference.trim().toLowerCase()}` : '';
        if (!seenPayId.has(p.id) && (!refKey || !seenPayKey.has(refKey))) {
          seenPayId.add(p.id);
          if (refKey) seenPayKey.add(refKey);
          dedupedPay.push(p);
        } else {
          needsSave = true;
        }
      }
      this.db.payments = dedupedPay;
    }

    // Ensure every event has a valid packagePrice, Proofing Gallery, and Media Delivery Vault
    const validProofingUrls = new Set(defaultPortfolioItems.map(i => i.image));
    this.db.events?.forEach(ev => {
      if (!ev.packagePrice || ev.packagePrice <= 0) {
        const eventDays = (this.db.daySchedules || []).filter(d => d.eventId === ev.id);
        const daysSum = eventDays.reduce((s, d) => s + Number(d.customPrice || 0), 0);
        ev.packagePrice = daysSum > 0 ? daysSum : 185000;
        const paid = (this.db.payments || [])
          .filter(p => p.eventId === ev.id && p.verificationStatus !== 'Rejected')
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        ev.totalClientPayments = paid;
        ev.remainingBalance = Math.max(0, ev.packagePrice - paid);
        this.db.invoices?.forEach(inv => {
          if (inv.eventId === ev.id && (!inv.total || inv.total <= 0)) {
            inv.subtotal = ev.packagePrice;
            inv.total = ev.packagePrice - Number(inv.discount || 0) + Number(inv.tax || 0);
            inv.remainingAmount = Math.max(0, inv.total - Number(inv.paidAmount || 0));
          }
        });
        this.db.quotations?.forEach(quo => {
          if (quo.eventId === ev.id && (!quo.total || quo.total <= 0)) {
            quo.subtotal = ev.packagePrice;
            quo.total = ev.packagePrice - Number(quo.discount || 0) + Number(quo.tax || 0);
          }
        });
        needsSave = true;
      }

      if (!ev.proofingGallery || !Array.isArray(ev.proofingGallery.photos) || ev.proofingGallery.photos.length === 0) {
        ev.proofingGallery = getDefaultProofingGalleryForEvent(ev.id, ev.title);
        needsSave = true;
      } else {
        const defPhotos = getDefaultProofingGalleryForEvent(ev.id, ev.title).photos;
        ev.proofingGallery.photos = ev.proofingGallery.photos.map((p, idx) => {
          const url = String(p.url || '').trim();
          if (url.startsWith('/portfolio/') && !validProofingUrls.has(url)) {
            needsSave = true;
            return {
              ...p,
              url: defPhotos[idx % defPhotos.length]?.url || '/portfolio/bridal-01-mirror-portrait.jpg',
            };
          }
          return p;
        });
      }

      // Ensure every event has Automated Media Delivery Vault (15GB Google Drive + YouTube Unlisted Playlist)
      const linkedClient = this.db.clients?.find(c => c.id === ev.clientId);
      if (!ev.mediaDelivery || !ev.mediaDelivery.driveFolderUrl || !ev.mediaDelivery.adminOnlyDriveCredentials) {
        ev.mediaDelivery = buildDefaultMediaDeliveryVault(ev, linkedClient);
        needsSave = true;
      }
      if (this.db.clients && syncEventMediaDeliveryToClientProfile(ev, this.db.clients)) {
        needsSave = true;
      }
    });

    // Replace any legacy M. Bilal Khan in eventExpenses
    this.db.eventExpenses?.forEach(exp => {
      if (exp.paidBy === 'M. Bilal Khan') {
        exp.paidBy = 'Royal Studio';
        needsSave = true;
      }
    });

    // Sync official Royal Studio business profile settings
    const defaultProfile = getDefaultStudioProfile();
    if (!this.db.profile) {
      this.db.profile = defaultProfile;
      needsSave = true;
    } else {
      for (const [k, v] of Object.entries(defaultProfile)) {
        const key = k as keyof AdminProfile;
        if (this.db.profile[key] === undefined || this.db.profile[key] === null) {
          (this.db.profile as any)[key] = v;
          needsSave = true;
        }
      }
      if (!this.db.profile.studioName || this.db.profile.studioName === 'ROYAL STUDIO') {
        this.db.profile.studioName = 'Royal Studio';
        needsSave = true;
      }
      if (!this.db.profile.address || this.db.profile.address.includes('Gulberg')) {
        this.db.profile.address = 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
        this.db.profile.publicDisplayAddress = 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
        needsSave = true;
      }
      if (!this.db.profile.city || this.db.profile.city.includes('Lahore') || this.db.profile.city === 'Burewala, Punjab, Pakistan') {
        this.db.profile.city = 'Burewala';
        this.db.profile.district = 'Burewala';
        this.db.profile.province = 'Punjab';
        this.db.profile.country = 'Pakistan';
        this.db.profile.postalCode = '61010';
        needsSave = true;
      }
      if (!this.db.profile.phone || this.db.profile.phone === '+92 300 1234567') {
        this.db.profile.phone = '0308-4877073';
        needsSave = true;
      }
      if (!this.db.profile.phone2) {
        this.db.profile.phone2 = '0303-2213806';
        needsSave = true;
      }
      if (!this.db.profile.whatsapp || this.db.profile.whatsapp === '+92 321 7654321') {
        this.db.profile.whatsapp = '0308-4877073';
        needsSave = true;
      }
      if (!this.db.profile.description || this.db.profile.tagline.includes('Premier')) {
        this.db.profile.description = 'Luxury wedding photography, cinematic films, and brand shoots.';
        this.db.profile.tagline = 'Luxury wedding photography, cinematic films, and brand shoots.';
        needsSave = true;
      }
      if (!this.db.profile.facebook || this.db.profile.facebook === 'royalstudiopak') {
        this.db.profile.facebook = 'https://www.facebook.com/royalstudio089';
        needsSave = true;
      }
      if (!this.db.profile.instagram || this.db.profile.instagram === '@royalstudiopak') {
        this.db.profile.instagram = 'https://www.instagram.com/royalstudio089';
        needsSave = true;
      }
      if (!this.db.profile.youtube) {
        this.db.profile.youtube = 'https://www.youtube.com/@royalstudio089';
        needsSave = true;
      }
      if (!this.db.profile.tiktok) {
        this.db.profile.tiktok = 'https://www.tiktok.com/@royalstudio089';
        needsSave = true;
      }
      if (!this.db.profile.googleMapsUrl || this.db.profile.googleMapsUrl.includes('5rDZjYPNEKke33Fn7')) {
        this.db.profile.googleMapsUrl = 'https://maps.app.goo.gl/mQPek7wm4nCVjy8o9';
        needsSave = true;
      }
      if (!this.db.profile.website || this.db.profile.website.includes('.pk')) {
        this.db.profile.website = 'https://royalstudio.online';
        needsSave = true;
      }
      if (
        !this.db.profile.documentBackground ||
        this.db.profile.documentBackground === '/image.png' ||
        this.db.profile.documentBackground === '/invoice_lens_bg.jpg'
      ) {
        this.db.profile.documentBackground = '/01.jpg';
        needsSave = true;
      }
      if (
        !this.db.profile.invoiceBackground ||
        this.db.profile.invoiceBackground === '/image.png' ||
        this.db.profile.invoiceBackground === '/invoice_lens_bg.jpg'
      ) {
        this.db.profile.invoiceBackground = '/01.jpg';
        needsSave = true;
      }
      if (
        !this.db.profile.quotationBackground ||
        this.db.profile.quotationBackground === '/image.png' ||
        this.db.profile.quotationBackground === '/invoice_lens_bg.jpg'
      ) {
        this.db.profile.quotationBackground = '/01.jpg';
        needsSave = true;
      }
      if (
        !this.db.profile.receiptBackground ||
        this.db.profile.receiptBackground === '/image.png' ||
        this.db.profile.receiptBackground === '/invoice_lens_bg.jpg'
      ) {
        this.db.profile.receiptBackground = '/01.jpg';
        needsSave = true;
      }
    }

    if (!this.db.profileAuditLogs) {
      this.db.profileAuditLogs = [
        {
          id: 'audit-init-001',
          timestamp: '2026-10-01T09:00:00.000Z',
          userId: 'usr-admin',
          userName: 'Royal Studio',
          userRole: 'ADMIN',
          section: 'System Initialization',
          changedFields: ['address', 'city', 'phone', 'phone2', 'googleMapsUrl', 'bankAccounts'],
          summary: 'Initialized authoritative Royal Studio Profile (Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan).'
        }
      ];
      needsSave = true;
    }

    // Hash any legacy plaintext user passwords at rest
    if (Array.isArray(this.db.users)) {
      for (const u of this.db.users) {
        if (u.password && !u.password.startsWith('scrypt$')) {
          u.password = hashPassword(u.password);
          needsSave = true;
        }
      }
    }

    // Hydrate Public Website & Portfolio CMS data
    if (!this.db.cms) {
      this.db.cms = {
        portfolioItems: [...defaultPortfolioItems],
        pricingPackages: [...defaultPricingPackages],
        detailedServices: [...defaultDetailedServices],
        testimonials: [...defaultTestimonials],
        blogPosts: [...defaultBlogPosts],
        websiteLeads: [],
        websiteCustomization: JSON.parse(JSON.stringify(defaultWebsiteCustomization)),
        connectedSocialAccounts: JSON.parse(JSON.stringify(defaultConnectedSocialAccounts)),
        socialMediaPosts: JSON.parse(JSON.stringify(defaultSocialMediaPosts)),
      };
      needsSave = true;
    } else {
      if (!Array.isArray(this.db.cms.portfolioItems) || this.db.cms.portfolioItems.length === 0) {
        this.db.cms.portfolioItems = [...defaultPortfolioItems];
        needsSave = true;
      } else {
        const validSet = new Set(defaultPortfolioItems.map((i) => i.image));
        let fixedAny = false;
        this.db.cms.portfolioItems = this.db.cms.portfolioItems.map((item: any, idx: number) => {
          const img = String(item?.image || '').trim();
          if (img.startsWith('/portfolio/') && !img.startsWith('/portfolio/optimized/') && !validSet.has(img)) {
            fixedAny = true;
            const defaultMatch =
              defaultPortfolioItems.find((d) => d.id === item.id) ||
              defaultPortfolioItems[idx % defaultPortfolioItems.length];
            return {
              ...item,
              image: defaultMatch?.image || '/portfolio/bridal-03-outdoor-tree.jpg',
            };
          }
          return item;
        });
        if (fixedAny) {
          needsSave = true;
        }
      }
      if (!Array.isArray(this.db.cms.pricingPackages) || this.db.cms.pricingPackages.length === 0) {
        this.db.cms.pricingPackages = [...defaultPricingPackages];
        needsSave = true;
      }
      if (!Array.isArray(this.db.cms.detailedServices) || this.db.cms.detailedServices.length === 0) {
        this.db.cms.detailedServices = [...defaultDetailedServices];
        needsSave = true;
      }
      if (!Array.isArray(this.db.cms.testimonials) || this.db.cms.testimonials.length === 0) {
        this.db.cms.testimonials = [...defaultTestimonials];
        needsSave = true;
      }
      if (!Array.isArray(this.db.cms.blogPosts) || this.db.cms.blogPosts.length === 0) {
        this.db.cms.blogPosts = [...defaultBlogPosts];
        needsSave = true;
      }
      if (!Array.isArray(this.db.cms.websiteLeads)) {
        this.db.cms.websiteLeads = [];
        needsSave = true;
      }
      if (!this.db.cms.websiteCustomization) {
        this.db.cms.websiteCustomization = JSON.parse(JSON.stringify(defaultWebsiteCustomization));
        needsSave = true;
      } else if (this.db.cms.websiteCustomization.about) {
        const abt = this.db.cms.websiteCustomization.about;
        if (!abt.mainImage || abt.mainImage === '/portfolio/couple-01-garden-intimate.jpg') {
          abt.mainImage = '/team/co-founders.webp';
          needsSave = true;
        }
        if (!abt.secondaryImage || abt.secondaryImage === '/portfolio/bridal-03-outdoor-tree.jpg') {
          abt.secondaryImage = '/team/team.webp';
          needsSave = true;
        }
        if (Array.isArray(abt.founders)) {
          abt.founders.forEach((f, idx) => {
            if (!f.image || f.image === '/portfolio/groom-01-classic-sherwani.jpg') {
              f.image = idx === 1 ? '/team/talha-ramay.webp' : '/team/muhammad-ramzan.webp';
              needsSave = true;
            } else if (f.image === '/portfolio/boys-01-urban-portrait.jpg') {
              f.image = '/team/talha-ramay.webp';
              needsSave = true;
            }
          });
        }
      }
      if (!Array.isArray(this.db.cms.connectedSocialAccounts) || this.db.cms.connectedSocialAccounts.length === 0) {
        this.db.cms.connectedSocialAccounts = JSON.parse(JSON.stringify(defaultConnectedSocialAccounts));
        needsSave = true;
      }
      if (!Array.isArray(this.db.cms.socialMediaPosts) || this.db.cms.socialMediaPosts.length === 0) {
        this.db.cms.socialMediaPosts = JSON.parse(JSON.stringify(defaultSocialMediaPosts));
        needsSave = true;
      }
    }

    if (!this.db.sessions) {
      this.db.sessions = {};
    }

    return needsSave;
  }

  public async save(): Promise<void> {
    const adapter = getDatabaseAdapter<DatabaseSchema>();
    await adapter.writeAsync(this.db);
  }

  public async createBackupSnapshot(): Promise<void> {
    const adapter = getDatabaseAdapter<DatabaseSchema>();
    await adapter.createBackupAsync(this.db);
  }

  public async importDatabase(imported: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    await this.createBackupSnapshot();
    this.db = {
      ...this.db,
      ...imported,
      users: this.db.users,
      sessions: this.db.sessions,
    };
    await this.save();
    return this.db;
  }

  public getEngineStats(): DatabaseEngineStats & {
    counts: {
      clients: number;
      events: number;
      invoices: number;
      quotations: number;
      payments: number;
      portfolioItems: number;
    };
  } {
    const adapter = getDatabaseAdapter<DatabaseSchema>();
    const stats = adapter.getStats();
    return {
      ...stats,
      counts: {
        clients: this.db.clients?.length || 0,
        events: this.db.events?.length || 0,
        invoices: this.db.invoices?.length || 0,
        quotations: this.db.quotations?.length || 0,
        payments: this.db.payments?.length || 0,
        portfolioItems: this.db.cms?.portfolioItems?.length || 0,
      },
    };
  }

  public getSession(token: string): { userId: string; expiresAt: number; lastActiveAt: number } | null {
    if (!this.db.sessions) this.db.sessions = {};
    const session = this.db.sessions[token];
    if (!session) return null;
    const now = Date.now();
    const maxIdleMs = 60 * 60 * 1000; // 60 minutes maximum server-side idle window
    if (
      now > session.expiresAt ||
      (session.lastActiveAt && now - session.lastActiveAt > maxIdleMs)
    ) {
      delete this.db.sessions[token];
      void this.save();
      return null;
    }
    session.lastActiveAt = now;
    return session;
  }

  public async setSession(token: string, session: { userId: string; expiresAt: number; lastActiveAt: number }): Promise<void> {
    if (!this.db.sessions) this.db.sessions = {};
    this.db.sessions[token] = session;
    await this.save();
  }

  public async deleteSession(token: string): Promise<void> {
    if (this.db.sessions && this.db.sessions[token]) {
      delete this.db.sessions[token];
      await this.save();
    }
  }

  public getData(): DatabaseSchema {
    return this.db;
  }

  // Recalculate event financials and persist to Cloud Firestore
  public async recalculateEvent(eventId: string): Promise<Event | null> {
    const event = this.db.events.find(e => e.id === eventId);
    if (!event) return null;

    const schedules = this.db.daySchedules.filter(d => d.eventId === eventId);
    const team = this.db.teamAssignments.filter(t => t.eventId === eventId);
    const equip = this.db.equipmentAssignments.filter(eq => eq.eventId === eventId);
    const expenses = this.db.eventExpenses.filter(ex => ex.eventId === eventId);
    const payments = this.db.payments.filter(p => p.eventId === eventId);

    const calculated = calculateEventTotals(
      event,
      schedules,
      team,
      equip,
      expenses,
      payments
    );

    event.packagePrice = calculated.packagePrice;
    event.staffCost = calculated.staffCost;
    event.rentalCost = calculated.rentalCost;
    event.eventExpenses = calculated.eventExpenses;
    event.netProfit = calculated.netProfit;
    event.netMargin = calculated.netMargin;
    event.totalClientPayments = calculated.totalClientPayments;
    event.remainingBalance = calculated.remainingBalance;
    event.updatedDate = new Date().toISOString();

    // Also update any related invoices & quotations
    const invoice = this.db.invoices.find(inv => inv.eventId === eventId);
    if (invoice) {
      const disc = Number(event.discount ?? invoice.discount ?? 0);
      const tx = Number(event.tax ?? invoice.tax ?? 0);
      invoice.discount = disc;
      invoice.tax = tx;
      invoice.subtotal = event.packagePrice + disc;
      invoice.total = Math.max(0, event.packagePrice + tx);
      invoice.paidAmount = calculated.totalClientPayments;
      invoice.remainingAmount = Math.max(0, invoice.total - invoice.paidAmount);
      invoice.status = computeInvoiceStatus(invoice, invoice.paidAmount);
    }

    const quotation = this.db.quotations.find(quo => quo.eventId === eventId);
    if (quotation) {
      const disc = Number(event.discount ?? quotation.discount ?? 0);
      const tx = Number(event.tax ?? quotation.tax ?? 0);
      quotation.discount = disc;
      quotation.tax = tx;
      quotation.subtotal = event.packagePrice + disc;
      quotation.total = Math.max(0, event.packagePrice + tx);
      if (event.approvedByClient) {
        quotation.status = 'APPROVED';
        quotation.approvedByName = event.approvedByClient;
        quotation.approvedAt = event.approvedAt || new Date().toISOString();
        if (!quotation.signatureData) {
          quotation.signatureData = event.approvedByClient;
        }
      }
    }

    await this.save();
    return event;
  }
}

export const dbInstance = new StudioDatabase();
