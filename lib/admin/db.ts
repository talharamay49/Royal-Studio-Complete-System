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
  AuditLogEntry
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

  const clients: Client[] = [
    {
      id: 'cli-001',
      name: 'Tariq Mehmood & Family',
      phone: '+92 300 9876543',
      whatsapp: '+92 300 9876543',
      email: 'tariq.mehmood@example.com',
      address: 'House 14-A, DHA Phase 5',
      city: 'Lahore',
      notes: 'High profile wedding. Require top cinematography and live drone coverage.',
      createdDate: '2026-08-10T10:00:00.000Z',
      createdBy: 'usr-admin',
      hasLogin: true,
      userId: 'usr-client',
      loginStatus: 'ACTIVE',
    },
    {
      id: 'cli-002',
      name: 'Dr. Ayesha Siddiqui',
      phone: '+92 321 5566778',
      whatsapp: '+92 321 5566778',
      email: 'ayesha.siddiqui@example.pk',
      address: 'Sector F-7/2',
      city: 'Islamabad',
      notes: 'Nikah & Reception. Prefers soft pastel aesthetic and candid documentary style.',
      createdDate: '2026-08-15T11:30:00.000Z',
      createdBy: 'usr-admin'
    },
    {
      id: 'cli-003',
      name: 'Nexus Tech Global',
      phone: '+92 42 35789012',
      whatsapp: '+92 333 1122334',
      email: 'events@nexustech.pk',
      address: 'Arfa Software Technology Park, Ferozepur Road',
      city: 'Lahore',
      notes: 'Corporate tech summit and annual award banquet. Fast turnaround needed for PR reels.',
      createdDate: '2026-08-20T14:15:00.000Z',
      createdBy: 'usr-admin'
    },
    {
      id: 'cli-004',
      name: 'Omer Farooq & Hina Sheikh',
      phone: '+92 345 8899001',
      whatsapp: '+92 345 8899001',
      email: 'omer.sheikh@example.com',
      address: 'Clifton Block 4',
      city: 'Karachi',
      notes: 'Beach destination engagement shoot and sunset portraits.',
      createdDate: '2026-09-01T09:40:00.000Z',
      createdBy: 'usr-staff'
    },
    {
      id: 'cli-005',
      name: 'Al-Haram Developers',
      phone: '+92 301 2233445',
      whatsapp: '+92 301 2233445',
      email: 'media@alharamdev.pk',
      address: 'Bahria Town Sector C',
      city: 'Lahore',
      notes: 'Commercial architecture portfolio and aerial 4K video.',
      createdDate: '2026-09-05T16:00:00.000Z',
      createdBy: 'usr-admin'
    }
  ];

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

  const teamMembers: TeamMember[] = [
    {
      id: 'tm-001',
      name: 'Hamza Tariq',
      phone: '+92 321 4455667',
      whatsapp: '+92 321 4455667',
      email: 'hamza.photo@royalstudio.pk',
      role: 'Photographer',
      specialization: 'Fine-art Bridal & Stage Portraits',
      dailyRate: 12000,
      eventRate: 15000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2023-01-15',
      notes: 'Lead photographer with 8+ years experience in high-end Pakistani weddings.'
    },
    {
      id: 'tm-002',
      name: 'Daniyal Raza',
      phone: '+92 333 5566778',
      whatsapp: '+92 333 5566778',
      email: 'daniyal.candid@royalstudio.pk',
      role: 'Photographer',
      specialization: 'Candid Moments & Ambient Light',
      dailyRate: 10000,
      eventRate: 12000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2023-06-01',
      notes: 'Expert in street documentary and candid emotional captures.'
    },
    {
      id: 'tm-003',
      name: 'Usman Farooq',
      phone: '+92 300 7788990',
      whatsapp: '+92 300 7788990',
      email: 'usman.cine@royalstudio.pk',
      role: 'Videographer',
      specialization: 'Cinematic Gimbal Movement & Storytelling',
      dailyRate: 14000,
      eventRate: 16000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2022-11-10',
      notes: 'Primary director of photography on FX3 and Ronin rigs.'
    },
    {
      id: 'tm-004',
      name: 'Waleed Javed',
      phone: '+92 312 9900112',
      whatsapp: '+92 312 9900112',
      email: 'waleed.video@royalstudio.pk',
      role: 'Videographer',
      specialization: 'Stage Audio & Dual Camera Sync',
      dailyRate: 11000,
      eventRate: 13000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2024-02-15',
      notes: 'Second cinema shooter.'
    },
    {
      id: 'tm-005',
      name: 'Shahbaz Ahmed',
      phone: '+92 345 3344556',
      whatsapp: '+92 345 3344556',
      email: 'shahbaz.drone@royalstudio.pk',
      role: 'Drone Operator',
      specialization: 'High Speed Aerial Tracking & Cinematic Reveales',
      dailyRate: 12000,
      eventRate: 14000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2023-03-20',
      notes: 'Certified drone pilot for DJI Mavic 3 Cine and Inspire.'
    },
    {
      id: 'tm-006',
      name: 'Kamran Butt',
      phone: '+92 301 6677889',
      whatsapp: '+92 301 6677889',
      email: 'kamran.crew@royalstudio.pk',
      role: 'Assistant',
      specialization: 'Studio Strobes, Off-camera Flash & Rigging',
      dailyRate: 4000,
      eventRate: 5000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2024-01-10',
      notes: 'Reliable gear wrangler and boom operator.'
    },
    {
      id: 'tm-007',
      name: 'Zainab Ali',
      phone: '+92 334 2233445',
      whatsapp: '+92 334 2233445',
      email: 'zainab.edit@royalstudio.pk',
      role: 'Editor',
      specialization: 'DaVinci Resolve Color Grading & Teaser Edits',
      dailyRate: 8000,
      eventRate: 8000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2022-09-01',
      notes: 'In-house post-production lead.'
    },
    {
      id: 'tm-008',
      name: 'Sarah Sheikh',
      phone: '+92 322 8899112',
      whatsapp: '+92 322 8899112',
      email: 'sarah.design@royalstudio.pk',
      role: 'Album Designer',
      specialization: 'Minimalist Layouts & Typography',
      dailyRate: 6000,
      eventRate: 7000,
      availabilityStatus: 'Available',
      isActive: true,
      joiningDate: '2023-08-01',
      notes: 'Designs luxury Italian & Turkish flushmount books.'
    }
  ];

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

  const maintenanceLogs: EquipmentMaintenanceLog[] = [
    {
      id: 'mnt-001',
      equipmentId: 'eq-001',
      date: '2026-09-20',
      issue: 'Routine Service & Shutter Calibration Required',
      description: 'Camera passed 20 wedding uses. Sensor has minor dust spots visible above f/8.',
      reportedBy: 'Hamza Tariq',
      cost: 4500,
      status: 'Pending',
      repairNotes: 'Scheduled with official Sony Alpha Service Center in Mall Road, Lahore.'
    }
  ];

  // Realistic Complete Wedding Demo Event (Section 62 Scenario)
  const event1: Event = {
    id: 'evt-001',
    clientId: 'cli-001',
    title: 'Tariq Mehmood & Ayesha Wedding Celebration',
    category: 'Wedding',
    weddingSubtype: 'Barat',
    packageId: 'pkg-001',
    eventDate: '2026-10-15',
    startTime: '18:00',
    endTime: '23:30',
    venue: 'Royal Palm Golf & Country Club / PC Grand Ballroom',
    city: 'Lahore',
    status: 'Confirmed',
    packagePrice: 370000,
    advancePaid: 150000,
    discount: 0,
    tax: 0,
    notes: 'Premier 3-day wedding celebration. Drone clearance approved by venue security.',
    createdBy: 'usr-admin',
    createdDate: '2026-08-11T12:00:00.000Z',
    updatedDate: '2026-09-28T15:30:00.000Z',
    isMultiDay: true,
    staffCost: 88000,
    rentalCost: 32000,
    eventExpenses: 34500,
    netProfit: 215500,
    netMargin: 58.2,
    totalClientPayments: 150000,
    remainingBalance: 220000
  };

  const daySchedules: EventDaySchedule[] = [
    {
      id: 'day-001',
      eventId: 'evt-001',
      dayNumber: 1,
      date: '2026-10-14',
      eventType: 'Mehndi',
      venue: 'Royal Palm Fairways Hall, Lahore',
      startTime: '19:00',
      endTime: '23:30',
      callTime: '17:30',
      dressCode: 'Traditional Mustard & Emerald Green',
      notes: 'High tempo dance performances. Stage lighting needs extra warm strobes.',
      customPrice: 100000
    },
    {
      id: 'day-002',
      eventId: 'evt-001',
      dayNumber: 2,
      date: '2026-10-15',
      eventType: 'Barat',
      venue: 'Pearl Continental Grand Crystal Ballroom, Lahore',
      startTime: '18:30',
      endTime: '23:45',
      callTime: '16:30',
      dressCode: 'Formal Black Tie / Sherwani',
      notes: 'Bride entrance with traditional chadar. Full drone entry shot outside ballroom.',
      customPrice: 150000
    },
    {
      id: 'day-003',
      eventId: 'evt-001',
      dayNumber: 3,
      date: '2026-10-16',
      eventType: 'Walima',
      venue: 'Garrison Golf & Country Club Banquet, Lahore',
      startTime: '19:00',
      endTime: '23:00',
      callTime: '17:30',
      dressCode: 'Contemporary Pastel / Western Formals',
      notes: 'Family portraits before dinner. Couple outdoor sunset shoot on fairway.',
      customPrice: 120000
    }
  ];

  const teamAssignments: EventTeamAssignment[] = [
    {
      id: 'eta-001',
      eventId: 'evt-001',
      teamMemberId: 'tm-001',
      role: 'Photographer',
      date: '2026-10-15',
      hours: 18,
      rate: 15000,
      cost: 25000,
      notes: 'Lead photographer for all 3 days',
      assignmentStatus: 'Confirmed'
    },
    {
      id: 'eta-002',
      eventId: 'evt-001',
      teamMemberId: 'tm-002',
      role: 'Photographer',
      date: '2026-10-15',
      hours: 18,
      rate: 12000,
      cost: 18000,
      notes: 'Second candid photographer',
      assignmentStatus: 'Confirmed'
    },
    {
      id: 'eta-003',
      eventId: 'evt-001',
      teamMemberId: 'tm-003',
      role: 'Videographer',
      date: '2026-10-15',
      hours: 18,
      rate: 16000,
      cost: 22000,
      notes: 'Cinema director on FX3',
      assignmentStatus: 'Confirmed'
    },
    {
      id: 'eta-004',
      eventId: 'evt-001',
      teamMemberId: 'tm-005',
      role: 'Drone Operator',
      date: '2026-10-15',
      hours: 8,
      rate: 14000,
      cost: 14000,
      notes: 'Aerial coverage on Barat & Walima',
      assignmentStatus: 'Confirmed'
    },
    {
      id: 'eta-005',
      eventId: 'evt-001',
      teamMemberId: 'tm-006',
      role: 'Assistant',
      date: '2026-10-15',
      hours: 18,
      rate: 5000,
      cost: 9000,
      notes: 'Lighting assistant for 3 days',
      assignmentStatus: 'Confirmed'
    }
  ];

  const equipmentAssignments: EventEquipmentAssignment[] = [
    {
      id: 'eea-001',
      eventId: 'evt-001',
      equipmentId: 'eq-001',
      quantity: 1,
      rentalRate: 5000,
      rentalCost: 5000,
      isCheckedOut: true,
      isCheckedIn: false,
      notes: 'Hamza lead camera'
    },
    {
      id: 'eea-002',
      eventId: 'evt-001',
      equipmentId: 'eq-002',
      quantity: 1,
      rentalRate: 8000,
      rentalCost: 8000,
      isCheckedOut: true,
      isCheckedIn: false,
      notes: 'Usman primary FX3 rig'
    },
    {
      id: 'eea-003',
      eventId: 'evt-001',
      equipmentId: 'eq-003',
      quantity: 1,
      rentalRate: 3500,
      rentalCost: 3500,
      isCheckedOut: true,
      isCheckedIn: false,
      notes: '24-70mm GM II lens'
    },
    {
      id: 'eea-004',
      eventId: 'evt-001',
      equipmentId: 'eq-005',
      quantity: 1,
      rentalRate: 9000,
      rentalCost: 9000,
      isCheckedOut: false,
      isCheckedIn: false,
      notes: 'DJI Mavic 3 Cine kit'
    },
    {
      id: 'eea-005',
      eventId: 'evt-001',
      equipmentId: 'eq-006',
      quantity: 1,
      rentalRate: 4000,
      rentalCost: 4000,
      isCheckedOut: true,
      isCheckedIn: false,
      notes: 'Godox AD600 Pro strobe'
    },
    {
      id: 'eea-006',
      eventId: 'evt-001',
      equipmentId: 'eq-007',
      quantity: 1,
      rentalRate: 2500,
      rentalCost: 2500,
      isCheckedOut: true,
      isCheckedIn: false,
      notes: 'Rode Wireless PRO system'
    }
  ];

  const eventExpenses: EventExpense[] = [
    {
      id: 'exp-001',
      eventId: 'evt-001',
      category: 'Fuel',
      description: 'Fuel for crew van across Lahore venues (Mehndi, Barat, Walima)',
      amount: 14000,
      date: '2026-10-14',
      paidBy: 'Hamza Tariq',
      notes: 'PSO receipt attached'
    },
    {
      id: 'exp-002',
      eventId: 'evt-001',
      category: 'Catering',
      description: 'Dinner & refreshments for 5 crew members for 3 event days',
      amount: 15500,
      date: '2026-10-15',
      paidBy: 'Royal Studio',
      notes: 'Dinner at PC and venue lounge'
    },
    {
      id: 'exp-003',
      eventId: 'evt-001',
      category: 'Travel',
      description: 'Toll plaza & parking charges for 3 days',
      amount: 5000,
      date: '2026-10-16',
      paidBy: 'Kamran Butt',
      notes: 'VIP parking pass at Garrison'
    }
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv-001',
      invoiceNumber: 'RS-INV-1001',
      clientId: 'cli-001',
      eventId: 'evt-001',
      issueDate: '2026-08-11',
      dueDate: '2026-10-10',
      subtotal: 370000,
      discount: 0,
      tax: 0,
      total: 370000,
      paidAmount: 150000,
      remainingAmount: 220000,
      paymentTerms: '50% Advance at booking, remaining before event',
      notes: 'First advance received via Meezan Bank online transfer.',
      status: 'Partially Paid',
      createdBy: 'usr-admin'
    },
    {
      id: 'inv-002',
      invoiceNumber: 'RS-INV-1002',
      clientId: 'cli-003',
      eventId: 'evt-003',
      issueDate: '2026-08-25',
      dueDate: '2026-09-15', // Past due date!
      subtotal: 85000,
      discount: 0,
      tax: 0,
      total: 85000,
      paidAmount: 0,
      remainingAmount: 85000,
      paymentTerms: 'Net 15 days corporate payment terms',
      notes: 'Pending procurement clearance from client finance department.',
      status: 'Overdue',
      createdBy: 'usr-admin'
    }
  ];

  const payments: Payment[] = [
    {
      id: 'pay-001',
      paymentId: 'PAY-2026-001',
      eventId: 'evt-001',
      invoiceId: 'inv-001',
      amount: 150000,
      paymentDate: '2026-08-12',
      method: 'Bank Transfer',
      reference: 'TXN-MEEZ-994821',
      notes: '50% Booking advance confirmed in Meezan Bank account',
      createdBy: 'usr-admin'
    }
  ];

  const quotations: Quotation[] = [
    {
      id: 'quo-001',
      quotationNumber: 'RS-QUO-0001',
      clientId: 'cli-001',
      eventId: 'evt-001',
      issueDate: '2026-08-10',
      validUntil: '2026-09-10',
      subtotal: 370000,
      discount: 0,
      tax: 0,
      total: 370000,
      paymentTerms: '50% advance booking deposit required to lock dates.',
      notes: 'Includes custom luxury Italian leather album and drone cinematography.',
      createdBy: 'usr-admin'
    }
  ];

  const tasks: EventTask[] = [
    {
      id: 'tsk-001',
      eventId: 'evt-001',
      title: 'Drone Route Planning & Venue Clearance',
      assigneeId: 'tm-005',
      dueDate: '2026-10-10',
      priority: 'Urgent',
      status: 'In Progress',
      description: 'Obtain venue clearance from PC Ballroom and Royal Palm golf management for Mavic 3 aerial filming.',
      createdDate: '2026-08-15'
    },
    {
      id: 'tsk-002',
      eventId: 'evt-001',
      title: 'Shot List & Family Stage Hierarchy Meeting',
      assigneeId: 'tm-001',
      dueDate: '2026-10-11',
      priority: 'High',
      status: 'Pending',
      description: 'Review VIP guest list, key family portraits, and special entrance requests with bride and groom.',
      createdDate: '2026-08-15'
    },
    {
      id: 'tsk-003',
      eventId: 'evt-001',
      title: 'Same-Day Social Media Reel Delivery',
      assigneeId: 'tm-007',
      dueDate: '2026-10-16',
      priority: 'Urgent',
      status: 'Pending',
      description: 'Edit 60-second viral Instagram teaser within 24 hours of Barat event.',
      createdDate: '2026-08-15'
    },
    {
      id: 'tsk-004',
      eventId: 'evt-001',
      title: 'Master Color Grading & 4K Cinema Cut',
      assigneeId: 'tm-007',
      dueDate: '2026-11-05',
      priority: 'Normal',
      status: 'Pending',
      description: 'Complete DaVinci Resolve color grade and audio mix for full documentary film.',
      createdDate: '2026-08-15'
    }
  ];

  // Loss Leader Event (Net Profit < 0) as explicitly required by Section 31 & 60!
  const eventLossLeader: Event = {
    id: 'evt-002',
    clientId: 'cli-004',
    title: 'Clifton Beach Destination Engagement & Fashion Teaser',
    category: 'Engagement',
    packageId: 'pkg-003',
    eventDate: '2026-09-25',
    startTime: '15:00',
    endTime: '20:00',
    venue: 'Do Darya & French Beach',
    city: 'Karachi',
    status: 'Shoot Done',
    packagePrice: 65000,
    advancePaid: 65000,
    discount: 10000,
    tax: 0,
    notes: 'Promotional portfolio shoot. Extra travel and high-speed equipment resulted in operational loss.',
    createdBy: 'usr-admin',
    createdDate: '2026-08-28T09:00:00.000Z',
    updatedDate: '2026-09-26T18:00:00.000Z',
    isMultiDay: false,
    staffCost: 45000,
    rentalCost: 21500,
    eventExpenses: 18000,
    netProfit: -19500, // NET PROFIT < 0!
    netMargin: -30.0,
    totalClientPayments: 65000,
    remainingBalance: 0
  };

  const eventCorporate: Event = {
    id: 'evt-003',
    clientId: 'cli-003',
    title: 'Nexus Tech Global Summit & Innovation Awards',
    category: 'Corporate',
    packageId: 'pkg-004',
    eventDate: '2026-10-05',
    startTime: '09:00',
    endTime: '17:00',
    venue: 'Arfa Software Technology Park Auditorium',
    city: 'Lahore',
    status: 'Shoot Scheduled',
    packagePrice: 85000,
    advancePaid: 0,
    discount: 0,
    tax: 0,
    notes: 'Keynotes, panel discussions, and evening award gala.',
    createdBy: 'usr-admin',
    createdDate: '2026-08-22T10:00:00.000Z',
    updatedDate: '2026-09-27T11:00:00.000Z',
    isMultiDay: false,
    staffCost: 26000,
    rentalCost: 11000,
    eventExpenses: 7500,
    netProfit: 40500,
    netMargin: 47.6,
    totalClientPayments: 0,
    remainingBalance: 85000
  };

  const studioExpenses: StudioExpense[] = [
    {
      id: 'sexp-001',
      category: 'Rent',
      description: 'Monthly Studio Office Rent - Main Boulevard Gulberg III',
      amount: 140000,
      date: '2026-09-01',
      paymentMethod: 'Bank Transfer',
      recurring: true,
      notes: 'Paid via Meezan corporate cheque',
      createdBy: 'usr-admin'
    },
    {
      id: 'sexp-002',
      category: 'Utilities',
      description: 'Electricity & Studio Cooling Bill (LESCO)',
      amount: 45000,
      date: '2026-09-05',
      paymentMethod: 'JazzCash',
      recurring: true,
      notes: 'Peak summer studio editing air conditioning',
      createdBy: 'usr-admin'
    },
    {
      id: 'sexp-003',
      category: 'Internet',
      description: 'StormFiber Enterprise 100Mbps dedicated fiber line',
      amount: 12500,
      date: '2026-09-07',
      paymentMethod: 'Bank Transfer',
      recurring: true,
      notes: 'For fast 4K raw cloud uploads & client galleries',
      createdBy: 'usr-admin'
    },
    {
      id: 'sexp-004',
      category: 'Software',
      description: 'Adobe Creative Cloud Team License & Frame.io storage',
      amount: 28000,
      date: '2026-09-10',
      paymentMethod: 'Bank Transfer',
      recurring: true,
      notes: 'Annual recurring suite for 3 editing stations',
      createdBy: 'usr-admin'
    }
  ];

  const teamPayments: TeamPayment[] = [
    {
      id: 'tp-001',
      teamMemberId: 'tm-001',
      eventId: 'evt-001',
      paymentType: 'Advance',
      amount: 15000,
      date: '2026-09-15',
      paymentMethod: 'Bank Transfer',
      reference: 'TXN-TP-8841',
      notes: 'Advance for Tariq wedding shoot preparation',
      createdBy: 'usr-admin'
    },
    {
      id: 'tp-002',
      teamMemberId: 'tm-007',
      paymentType: 'Salary',
      amount: 65000,
      date: '2026-09-01',
      paymentMethod: 'Bank Transfer',
      reference: 'SAL-SEP-2026',
      notes: 'Monthly in-house editor retainer',
      createdBy: 'usr-admin'
    }
  ];

  return {
    users: [adminUser],
    profile,
    clients,
    events: [event1, eventLossLeader, eventCorporate],
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
    pinCode: '1234',
    isPublished: true,
    targetCountMin: 100,
    targetCountMax: 150,
    selectionStatus: 'Open' as const,
    clientSubmissionNote: title ? `Luxury Storybook Album Selection for ${title}` : '',
    photos: defaultPhotos,
  };
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
    const existingAdmin = this.db.users?.find(u => u.role === 'ADMIN');
    const hasDummyUsers = this.db.users?.some(
      u => u.id === 'usr-staff' || u.email === 'staff@royalstudio.pk' || u.email === 'admin@royalstudio.pk'
    );

    if (
      !existingAdmin ||
      existingAdmin.email !== 'admin@royalstudio.online' ||
      !verifyPassword('admin123', existingAdmin.password) ||
      hasDummyUsers
    ) {
      const validPassHash =
        existingAdmin && verifyPassword('admin123', existingAdmin.password)
          ? existingAdmin.password
          : hashPassword('admin123');

      const preservedNonAdminUsers = (this.db.users || []).filter(
        u =>
          (u.role === 'STAFF' || u.role === 'CLIENT') &&
          u.id !== 'usr-staff' &&
          u.email !== 'staff@royalstudio.pk' &&
          u.email !== 'admin@royalstudio.pk'
      );

      if (!preservedNonAdminUsers.some(u => u.role === 'CLIENT' && u.linkedClientId === 'cli-001')) {
        preservedNonAdminUsers.push({
          id: 'usr-client',
          name: 'Tariq Mehmood',
          email: 'tariq.mehmood@example.com',
          role: 'CLIENT',
          status: 'ACTIVE',
          phone: '+92 300 9876543',
          linkedClientId: 'cli-001',
          password: hashPassword('client123'),
          createdDate: '2026-08-10T10:00:00.000Z',
        });
      }

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
        ...preservedNonAdminUsers,
      ];
      needsSave = true;
    }

    // Ensure demo client user exists if cli-001 exists and has no linked user
    if (
      this.db.clients?.some(c => c.id === 'cli-001') &&
      !this.db.users?.some(u => u.role === 'CLIENT' && u.linkedClientId === 'cli-001')
    ) {
      this.db.users.push({
        id: 'usr-client',
        name: 'Tariq Mehmood',
        email: 'tariq.mehmood@example.com',
        role: 'CLIENT',
        status: 'ACTIVE',
        phone: '+92 300 9876543',
        linkedClientId: 'cli-001',
        password: hashPassword('client123'),
        createdDate: '2026-08-10T10:00:00.000Z',
      });
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

    // Sync client login status with user accounts
    this.db.clients?.forEach(c => {
      const linkedUser = this.db.users?.find(u => u.linkedClientId === c.id || (u.role === 'CLIENT' && u.id === c.userId));
      if (linkedUser) {
        if (!c.hasLogin || c.userId !== linkedUser.id || c.loginStatus !== linkedUser.status) {
          c.hasLogin = true;
          c.userId = linkedUser.id;
          c.loginStatus = linkedUser.status;
          needsSave = true;
        }
      } else {
        if (c.hasLogin || c.userId || c.loginStatus) {
          c.hasLogin = false;
          delete c.userId;
          delete c.loginStatus;
          needsSave = true;
        }
      }
    });

    // Ensure every event has a Proofing Gallery initialized
    this.db.events?.forEach(ev => {
      if (!ev.proofingGallery) {
        ev.proofingGallery = getDefaultProofingGalleryForEvent(ev.id, ev.title);
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
    }

    await this.save();
    return event;
  }
}

export const dbInstance = new StudioDatabase();
