import type {
  BlogPost,
  PortfolioCategory,
  PortfolioItem,
  PricingPackage,
  Service,
  Testimonial,
} from "@/types";

export const siteConfig = {
  name: "Royal Studio",
  tagline: "Luxury wedding photography, cinematic films, and brand shoots.",
  description:
    "Luxury wedding photography and cinematic filmmaking across Pakistan. 3000+ weddings documented with timeless artistry since 2018",
  url: "https://royalstudio.online",
  founders: ["Muhammad Ramzan", "Talha Ramay"],
  established: 2018,
  email: "royalstudio089@gmail.com",
  phones: ["0308-4877073", "0303-2213806"],
  whatsapp: "0308-4877073",
  address: {
    line1: "Al Jannat Town Entrance, Canal Bungalow Road",
    line2: "Opposite Habib Mall",
    city: "Burewala",
    district: "Burewala",
    province: "Punjab",
    postal: "61010",
    country: "Pakistan",
    full: "Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan",
  },
  social: {
    instagram: "https://www.instagram.com/royalstudio089",
    facebook: "https://www.facebook.com/royalstudio089",
    youtube: "https://www.youtube.com/@royalstudio089",
    tiktok: "https://www.tiktok.com/@royalstudio089",
    maps: "https://maps.app.goo.gl/mQPek7wm4nCVjy8o9",
  },
  citiesServed: [
    "Burewala",
    "Vehari",
    "Multan",
    "Sahiwal",
    "Faisalabad",
    "Lahore",
    "Bahawalnagar",
    "Bahawalpur",
    "Islamabad",
    "Weddings across Pakistan",
  ],
  stats: {
    weddings: "3000+",
    experience: "8+",
    team: "10–15",
    delivery: "20-Day",
    satisfaction: "100%",
  },
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Wedding Films", href: "/wedding-films" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const homeServices = [
  {
    id: "wedding-photography",
    title: "Wedding Photography",
    description: "Full-day coverage capturing every sacred moment with editorial elegance.",
    icon: "camera",
  },
  {
    id: "wedding-films",
    title: "Wedding Films",
    description: "Cinematic films that preserve the emotion, music, and magic of your day.",
    icon: "film",
  },
  {
    id: "bridal-portraits",
    title: "Bridal Portraits",
    description: "Stunning bridal editorials crafted with luxury lighting and artistry.",
    icon: "sparkles",
  },
  {
    id: "fashion",
    title: "Fashion Photography",
    description: "High-end campaigns for designers, brands, and creative collaborations.",
    icon: "shirt",
  },
  {
    id: "corporate",
    title: "Corporate Photography",
    description: "Professional event and brand coverage with polished deliverables.",
    icon: "building",
  },
  {
    id: "drone",
    title: "Drone Coverage",
    description: "Aerial perspectives that elevate your wedding film and photography.",
    icon: "plane",
  },
  {
    id: "albums",
    title: "Luxury Albums",
    description: "Museum-quality albums designed to become family heirlooms.",
    icon: "book",
  },
  {
    id: "reels",
    title: "Social Media Reels",
    description: "Trend-forward reels optimized for Instagram and TikTok sharing.",
    icon: "video",
  },
];

export const aboutHighlights = [
  "3000+ weddings documented",
  "Professional 10–15 member team",
  "Luxury heirloom albums",
  "Cinematic wedding films",
  "Drone aerial coverage",
  "Fast 20-day delivery",
];

export const weddingProcess = [
  { step: 1, title: "Inquiry", description: "Share your wedding date, venue, and vision with our team." },
  { step: 2, title: "Consultation", description: "We discuss your style, timeline, and coverage needs." },
  { step: 3, title: "Booking", description: "Secure your date with a signed agreement and deposit." },
  { step: 4, title: "Planning", description: "Detailed pre-wedding planning and shot list coordination." },
  { step: 5, title: "Wedding Day", description: "Our team captures every moment with cinematic precision." },
  { step: 6, title: "Editing", description: "Expert color grading, retouching, and film editing." },
  { step: 7, title: "Album Design", description: "Custom luxury album layouts crafted for your story." },
  { step: 8, title: "Delivery", description: "Digital gallery, films, and albums delivered with care." },
];

export const statistics = [
  { value: "3000+", label: "Weddings Captured" },
  { value: "8+ Years", label: "Experience" },
  { value: "20-Day", label: "Delivery Timeline" },
  { value: "100%", label: "Client Satisfaction" },
  { value: "Sony & Canon", label: "Latest Equipment" },
  { value: "Drone", label: "Aerial Coverage" },
];

export const faqItems = [
  {
    question: "How do I book Royal Studio for my wedding?",
    answer:
      "Contact us via the inquiry form, WhatsApp, or phone. We'll schedule a consultation to discuss your date, venue, and package options. A signed agreement and deposit secures your booking.",
  },
  {
    question: "What are your pricing packages?",
    answer:
      "We offer Essential (from PKR 50,000), Premium, and Royal Signature (up to PKR 300,000) packages. Custom quotes are available for destination weddings and multi-day events.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Standard delivery is within 20 days for photos and films. Rush delivery and same-day edits are available for select packages — ask during consultation.",
  },
  {
    question: "Do you travel for destination weddings?",
    answer:
      "Yes. We serve Burewala, Lahore, Multan, Islamabad, and weddings across Pakistan. Travel and accommodation costs are quoted separately for out-of-city events.",
  },
  {
    question: "Is drone coverage included?",
    answer:
      "Drone coverage is available as an add-on or included in Premium and Royal Signature packages, subject to venue permissions and weather conditions.",
  },
  {
    question: "What album options do you offer?",
    answer:
      "We design luxury heirloom albums with premium papers, lay-flat binding, and custom layouts. Album design is included in select packages.",
  },
  {
    question: "Do you offer same-day edits?",
    answer:
      "Same-day highlight edits and social media reels can be arranged for an additional fee. Availability depends on your wedding date and package.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Deposits are non-refundable but may be transferred to a new date within 12 months, subject to availability. Full terms are outlined in your booking agreement.",
  },
];

export const portfolioCategories: { id: PortfolioCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "nikah", label: "Nikah" },
  { id: "mehndi", label: "Mehndi" },
  { id: "barat", label: "Barat" },
  { id: "walima", label: "Walima" },
  { id: "bridal", label: "Bridal" },
  { id: "couple", label: "Couple Portraits" },
  { id: "fashion", label: "Fashion" },
  { id: "corporate", label: "Corporate" },
  { id: "indoor", label: "Indoor" },
  { id: "outdoor", label: "Outdoor" },
  { id: "boys", label: "Boys" },
  { id: "groom", label: "Groom" },
  { id: "bride", label: "Bride" },
  { id: "birthday", label: "Birthday" },
  { id: "expo", label: "Expo" },
];

export const portfolioItems: PortfolioItem[] = [
  { id: 1, title: "Nikah Venue Setup", category: "nikah", image: "/portfolio/nikah-01-venue-setup.jpg", aspect: "wide", location: "Chishtian" },
  { id: 2, title: "Mehndi Setup — Chishtiya Taj Palace", category: "mehndi", image: "/portfolio/mehndi-01-chishtiya-taj-palace.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 3, title: "Groom's Mehndi Night Arrival", category: "mehndi", image: "/portfolio/mehndi-02-groom-arrival.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 4, title: "Barat Groom Ready — Shehroz Bhatti", category: "barat", image: "/portfolio/barat-01-shehroz-groom-ready.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 5, title: "Barat Day Turban Moment", category: "barat", image: "/portfolio/barat-02-groom-turban-moment.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 6, title: "Groom Portrait", category: "barat", image: "/portfolio/barat-03-groom-portrait.jpg", aspect: "square" },
  { id: 7, title: "Walima Reception Hall", category: "walima", image: "/portfolio/walima-01-reception-hall.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 8, title: "Bridal Mirror Portrait", category: "bridal", image: "/portfolio/bridal-01-mirror-portrait.jpg", aspect: "square" },
  { id: 9, title: "Bridal Henna Detail", category: "bridal", image: "/portfolio/bridal-02-henna-hands.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 10, title: "Outdoor Bridal Portrait", category: "bridal", image: "/portfolio/bridal-03-outdoor-tree.jpg", aspect: "tall", location: "Punjab, Pakistan" },
  { id: 11, title: "Bridal Courtyard Portrait", category: "bridal", image: "/portfolio/bridal-04-courtyard-portrait.jpg", aspect: "tall", location: "Punjab, Pakistan" },
  { id: 12, title: "Sherwani Fabric Detail", category: "fashion", image: "/portfolio/fashion-01-fabric-detail.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 13, title: "Alkhidmat Foundation Iftar Coverage", category: "corporate", image: "/portfolio/corporate-01-alkhidmat-iftar.jpg", aspect: "wide", location: "Burewala" },
  { id: 14, title: "Jashan-e-Azadi Community Program", category: "corporate", image: "/portfolio/corporate-02-jashan-e-azadi.jpg", aspect: "wide", location: "Minchanabad" },
  { id: 15, title: "Floral Ceiling Decor", category: "indoor", image: "/portfolio/indoor-01-floral-ceiling-decor.jpg", aspect: "wide", location: "Burewala" },
  { id: 16, title: "Night Drive", category: "outdoor", image: "/portfolio/outdoor-01-night-drive.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 17, title: "Evening Garden Gathering", category: "outdoor", image: "/portfolio/outdoor-02-evening-gathering.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 18, title: "Squad Night Out", category: "boys", image: "/portfolio/boys-01-squad-night-out.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 19, title: "Groom Ready — Amir", category: "groom", image: "/portfolio/groom-01-amir-outdoor-ready.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 20, title: "Bride Courtyard Profile", category: "bride", image: "/portfolio/bride-01-courtyard-profile.jpg", aspect: "tall", location: "Punjab, Pakistan" },
  { id: 21, title: "Birthday Swing", category: "birthday", image: "/portfolio/birthday-01-swing.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 22, title: "Garden Birthday Party", category: "birthday", image: "/portfolio/birthday-02-garden-party.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 23, title: "Waddian Mela — Community Fair Coverage", category: "expo", image: "/portfolio/expo-01-waddian-mela.jpg", aspect: "wide", location: "Zarai University, Faisalabad (Burewala Campus)" },
  { id: 24, title: "Groom's Sherwani Ready", category: "barat", image: "/portfolio/barat-04-groom-sherwani-hanging.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 25, title: "Barat Outfit Layout", category: "barat", image: "/portfolio/barat-05-sherwani-layout.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 26, title: "Barat Venue Aerial View — Faisal & Mubara", category: "barat", image: "/portfolio/barat-06-venue-aerial.jpg", aspect: "wide", location: "Burewala" },
  { id: 27, title: "Barat Band Procession", category: "barat", image: "/portfolio/barat-07-band-procession.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 28, title: "Groom's Barat Departure", category: "barat", image: "/portfolio/barat-08-departure.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 29, title: "Groom's Barat Preparations", category: "barat", image: "/portfolio/barat-09-groom-lounge.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 30, title: "Groom Ready for Barat", category: "barat", image: "/portfolio/barat-10-groom-portrait.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 31, title: "Barat Car Arrival with Colored Smoke", category: "barat", image: "/portfolio/barat-11-car-smoke.jpg", aspect: "square", location: "Punjab, Pakistan" },
  { id: 32, title: "Barat Car Decoration", category: "barat", image: "/portfolio/barat-12-car-decoration.jpg", aspect: "wide", location: "Islamabad" },
  { id: 33, title: "Mehndi Stage Aerial View", category: "mehndi", image: "/portfolio/mehndi-03-drone-decor.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 34, title: "Mehndi Hands Detail", category: "mehndi", image: "/portfolio/mehndi-04-henna-hands.jpg", aspect: "wide", location: "Qasr-e-Musarat Marquee, Haroonabad" },
  { id: 35, title: "Mehndi Henna Detail", category: "mehndi", image: "/portfolio/mehndi-05-henna-detail.jpg", aspect: "wide", location: "Qasr-e-Musarat Marquee, Haroonabad" },
  { id: 36, title: "Mehndi Stage Decor", category: "mehndi", image: "/portfolio/mehndi-06-stage-decor.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 37, title: "Groom's Mehndi Entry", category: "mehndi", image: "/portfolio/mehndi-07-groom-entry.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 38, title: "Walima Hall Floral Decor", category: "walima", image: "/portfolio/walima-02-hall-decor.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 39, title: "Walima Venue at Night", category: "walima", image: "/portfolio/walima-03-venue-aerial.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 40, title: "Grand Wedding Venue", category: "walima", image: "/portfolio/walima-04-grand-venue.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 41, title: "Fazal Mukhtar Marriage Hall", category: "walima", image: "/portfolio/walima-05-marriage-hall.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 42, title: "Walima Groom Portrait", category: "walima", image: "/portfolio/walima-06-groom-portrait.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 43, title: "Bridal Blue Lehnga", category: "bridal", image: "/portfolio/bridal-06-blue-lehnga.jpg", aspect: "tall", location: "Punjab, Pakistan" },
  { id: 44, title: "Couple Portrait", category: "couple", image: "/portfolio/couple-01-pillars.jpg", aspect: "square" },
  { id: 45, title: "Annum & Ali — Mehndi Shoot", category: "couple", image: "/portfolio/couple-02-annum-ali-mehndi.jpg", aspect: "wide" },
  { id: 46, title: "Walima Couple Portrait", category: "couple", image: "/portfolio/couple-03-walima-laugh.jpg", aspect: "wide" },
  { id: 47, title: "Annum & Ali — Walima Teaser", category: "couple", image: "/portfolio/couple-04-annum-ali-walima.jpg", aspect: "square" },
  { id: 48, title: "Outdoor Couple Shoot", category: "couple", image: "/portfolio/couple-05-outdoor.jpg", aspect: "square" },
  { id: 49, title: "Rubab — Chikankari Art Fashion Shoot", category: "fashion", image: "/portfolio/fashion-02-rubab-chikankari.jpg", aspect: "tall" },
  { id: 50, title: "Zaib — Fashion Shoot", category: "fashion", image: "/portfolio/fashion-03-zaib.jpg", aspect: "tall" },
  { id: 51, title: "Pink Kaftan Eid Dress", category: "fashion", image: "/portfolio/fashion-04-pink-kaftan.jpg", aspect: "tall" },
  { id: 52, title: "Green Eid Collection Dress", category: "fashion", image: "/portfolio/fashion-05-green-eid.jpg", aspect: "tall" },
  { id: 53, title: "Pink Eid Collection Dress", category: "fashion", image: "/portfolio/fashion-06-pink-eid.jpg", aspect: "tall" },
  { id: 54, title: "White Dress Editorial", category: "fashion", image: "/portfolio/fashion-07-white-dress.jpg", aspect: "tall" },
  { id: 55, title: "Fashion Shoot Detail", category: "fashion", image: "/portfolio/fashion-08-green-outfit.jpg", aspect: "tall" },
  { id: 56, title: "Red Outfit Fashion Shoot", category: "fashion", image: "/portfolio/fashion-09-red-outfit.jpg", aspect: "square" },
  { id: 57, title: "Groom's Barat Outfit & Accessories", category: "fashion", image: "/portfolio/fashion-10-groom-accessories.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 58, title: "ATHA E-Commerce Commercial Shoot", category: "corporate", image: "/portfolio/corporate-03-atha-commercial.jpg", aspect: "wide", location: "Faisalabad" },
  { id: 59, title: "Superior College Burewala — Commercial", category: "corporate", image: "/portfolio/corporate-04-superior-college.jpg", aspect: "wide", location: "Burewala" },
  { id: 60, title: "Trust Auditorium Banquet Setup", category: "corporate", image: "/portfolio/corporate-05-trust-auditorium.jpg", aspect: "square" },
  { id: 61, title: "Crystal Chandelier Detail", category: "indoor", image: "/portfolio/indoor-02-chandelier.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 62, title: "Groom Getting Ready", category: "groom", image: "/portfolio/groom-02-salon-ready.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 63, title: "Groom Mehndi Dressing", category: "groom", image: "/portfolio/groom-03-mehndi-dressing.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 64, title: "Groom Entry with Friends", category: "boys", image: "/portfolio/boys-02-friends-entry.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 65, title: "Outdoor Birthday Celebration Decor", category: "birthday", image: "/portfolio/birthday-03-outdoor-decor.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 66, title: "Baby Girl Birthday Party", category: "birthday", image: "/portfolio/birthday-04-baby-girl.jpg", aspect: "wide", location: "Punjab, Pakistan" },
  { id: 67, title: "Groom's Nikah Prep", category: "nikah", image: "/portfolio/nikah-02-groom-prep.jpg", aspect: "wide", location: "Punjab, Pakistan" },
];

export const featuredFilm = {
  title: "Barat Groom GRWM — Cinematic Wedding Film",
  youtubeId: "wF_5efX_Kwo",
  description: "A cinematic look at the quiet moments before the celebration — the groom getting ready ahead of his Barat, captured with Royal Studio's signature editorial style.",
};

export const weddingFilms = [
  { id: 1, title: "Barat Ceremony — Grand Vista", youtubeId: "QF3BmojTrKQ", location: "Wah Cantt", duration: "0:37" },
  { id: 2, title: "The Most Epic Mehndi Night", youtubeId: "UgG6hsk5AU8", location: "Punjab, Pakistan", duration: "2:26" },
  { id: 3, title: "Walima Day, Made Timeless", youtubeId: "IHpGkLHnmpU", location: "Punjab, Pakistan", duration: "0:56" },
  { id: 4, title: "Nikah Setup — Faisal's Nikah", youtubeId: "qqC4CAEDWF8", location: "Chishtian", duration: "0:56" },
  { id: 5, title: "Elegant Barat Decor", youtubeId: "89LnBRn3KXw", location: "Burewala", duration: "0:36" },
  { id: 6, title: "Mayoun Celebration", youtubeId: "zZ1eGi64B00", location: "Punjab, Pakistan", duration: "0:18" },
];

export const googleRating = {
  score: 4.9,
  reviewCount: 74,
};

export const testimonials: Testimonial[] = [
  {
    quote: "I had an amazing experience at Royal Studio! The team was incredibly professional and made me feel at ease throughout the entire session. The quality of the photos was outstanding — every shot was sharp, creative, and beautifully edited.",
    author: "Mehak Ch",
    event: "Verified Google Review",
  },
  {
    quote: "Had an amazing experience at Royal Studio! The team was professional, creative, and made the entire shoot stress-free. The photos turned out stunning - exceeded my expectations! Highly recommend for anyone looking for high-quality photography services.",
    author: "Makeover By Laila",
    event: "Verified Google Review",
  },
  {
    quote: "Wondering experience — I loved the creativity and effort you put in the shoot, result turned out lovely. Highly recommend by my side.",
    author: "Abeeha Hussain",
    event: "Verified Google Review",
    location: "Burewala",
  },
  {
    quote: "Mashallah great work by Royal Studio, specially Ramzan Bhai and Talha doing great job, nice results and edition outstanding, keep it up bro.",
    author: "Hamza Fareed",
    event: "Verified Google Review",
  },
  {
    quote: "Their services are excellent and I prefer to book with them on your every event, they make your event memorable. Thanks to them for making my event memorable.",
    author: "Rai Sabir",
    event: "Verified Google Review",
  },
  {
    quote: "Our experience was so good with Royal Studio, they delivered more than our expectations.",
    author: "Malik Ali",
    event: "Verified Google Review",
  },
  {
    quote: "Very good experience, team are so talented, their photographic skills are amazing.",
    author: "Umair Ch",
    event: "Verified Google Review",
  },
  {
    quote: "Fabulous Royal Studio. Every video shooting is wonderful.",
    author: "Zainab Shehzad",
    event: "Verified Google Review",
  },
];

export const pricingPackages: PricingPackage[] = [
  {
    id: "essential",
    name: "Essential",
    price: "PKR 50,000",
    priceNote: "Starting from",
    description: "Perfect for intimate weddings seeking beautiful coverage and timeless memories.",
    features: [
      "6 hours photography coverage",
      "1 senior photographer",
      "300+ edited photos",
      "Online gallery delivery",
      "20-day delivery timeline",
      "Basic retouching",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "PKR 150,000",
    priceNote: "Starting from",
    description: "Our most popular package for full wedding celebrations with photo and film.",
    features: [
      "Full-day photo + film coverage",
      "2 photographers + 1 cinematographer",
      "Cinematic highlight film (5–8 min)",
      "600+ edited photos",
      "Drone coverage (venue permitting)",
      "Luxury album design",
      "Social media reels",
      "20-day delivery",
    ],
    highlighted: true,
  },
  {
    id: "royal-signature",
    name: "Royal Signature",
    price: "PKR 300,000",
    priceNote: "Up to",
    description: "The ultimate luxury experience for couples who demand editorial excellence.",
    features: [
      "Multi-day coverage (Nikah, Mehndi, Barat, Walima)",
      "Full creative team (10–15 members)",
      "Feature-length cinematic film",
      "1000+ edited photos",
      "Premium drone + gimbal coverage",
      "Heirloom luxury album",
      "Same-day highlight reel (optional)",
      "Dedicated wedding planner liaison",
      "Priority 15-day delivery",
    ],
  },
];

export const detailedServices: Service[] = [
  {
    id: "wedding-photography",
    title: "Wedding Photography",
    shortDescription: "Editorial wedding photography across all Pakistani traditions.",
    description: "From Nikah to Walima, our photographers document every sacred moment with editorial precision and emotional depth. We specialize in luxury weddings across Pakistan.",
    deliverables: ["Full-day coverage", "600–1000+ edited images", "Online gallery", "Luxury album options", "Print-ready files"],
    process: ["Consultation", "Shot list planning", "Wedding day coverage", "Culling & editing", "Gallery delivery", "Album design"],
    equipment: ["Sony A7IV / A7RV", "Canon R5", "Profoto lighting", "Prime & zoom lens kit"],
    faq: [{ question: "How many photographers?", answer: "1–3 photographers depending on package and event scale." }],
    icon: "camera",
  },
  {
    id: "cinematic-films",
    title: "Cinematic Wedding Films",
    shortDescription: "Hollywood-grade wedding films with cinematic storytelling.",
    description: "Our cinematographers craft feature-length and highlight films that preserve the music, vows, and emotions of your celebration.",
    deliverables: ["Highlight film (5–15 min)", "Feature film (optional)", "Ceremony & speeches", "Drone footage", "Social reels"],
    process: ["Pre-wedding consultation", "Multi-cam coverage", "Audio recording", "Color grading", "Music licensing", "Final delivery"],
    equipment: ["Sony FX3 / FX6", "Gimbal stabilizers", "DJI drone", "Wireless lav mics"],
    faq: [{ question: "Film delivery time?", answer: "Standard 20 days; rush delivery available." }],
    icon: "film",
  },
  {
    id: "bridal-editorials",
    title: "Bridal Editorials",
    shortDescription: "Luxury bridal portraits and getting-ready coverage.",
    description: "Stunning bridal editorials with luxury lighting, posing direction, and magazine-quality retouching.",
    deliverables: ["Bridal session", "Getting-ready coverage", "50–100 edited portraits", "Album spreads"],
    process: ["Style consultation", "Location scouting", "Session day", "Retouching", "Delivery"],
    equipment: ["Studio strobes", "Natural light modifiers", "85mm & 50mm primes"],
    faq: [{ question: "Include makeup coordination?", answer: "We coordinate with your MUA for optimal timing." }],
    icon: "sparkles",
  },
  {
    id: "fashion-campaigns",
    title: "Fashion Campaigns",
    shortDescription: "High-end fashion and brand photography.",
    description: "Editorial campaigns for designers, boutiques, and fashion brands across Pakistan.",
    deliverables: ["Campaign imagery", "Lookbook photos", "Social assets", "Retouching"],
    process: ["Creative brief", "Mood boards", "Shoot day", "Post-production", "Asset delivery"],
    equipment: ["Full studio kit", "Multiple lighting setups", "Medium format options"],
    faq: [{ question: "Commercial licensing?", answer: "Usage rights included per agreement terms." }],
    icon: "shirt",
  },
  {
    id: "corporate-events",
    title: "Corporate Events",
    shortDescription: "Professional corporate and gala event coverage.",
    description: "Polished photography and video for conferences, galas, product launches, and corporate celebrations.",
    deliverables: ["Event coverage", "Edited photos", "Highlight video", "Same-day options"],
    process: ["Brief & timeline", "On-site coverage", "Quick turnaround editing", "Delivery"],
    equipment: ["Dual camera setup", "Event lighting", "Audio capture"],
    faq: [{ question: "Corporate rates?", answer: "Custom quotes based on duration and deliverables." }],
    icon: "building",
  },
  {
    id: "product-photography",
    title: "Product Photography",
    shortDescription: "Premium product and commercial photography.",
    description: "Clean, luxury product imagery for e-commerce, catalogs, and advertising campaigns.",
    deliverables: ["Product shots", "Lifestyle imagery", "Retouched files", "Multiple angles"],
    process: ["Product intake", "Styling & setup", "Shoot", "Retouching", "Delivery"],
    equipment: ["Macro lenses", "Light tent", "Studio backdrop system"],
    faq: [{ question: "Minimum order?", answer: "Packages start from 10 products; contact for quotes." }],
    icon: "package",
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "wedding-planning-checklist-pakistan",
    title: "The Ultimate Wedding Planning Checklist for Pakistani Couples",
    excerpt: "A comprehensive guide to planning your Nikah, Mehndi, Barat, and Walima with confidence.",
    image: "/portfolio/walima-03-venue-aerial.jpg",
    date: "June 15, 2026",
    dateISO: "2026-06-15",
    category: "Wedding Planning",
    content:
      "Planning a Pakistani wedding means coordinating several distinct events — Nikah, Mehndi, Barat, and Walima — each with its own venue, guest list, outfits, and vendors. Unlike a single-day wedding, a multi-event celebration rewards couples who start early and work from a clear timeline rather than tackling everything at once.\n\n" +
      "**Start with your date and budget.** Before booking anything, agree as a family on rough dates for each event and a total budget split across venue, catering, outfits, decor, and photography/videography. In Pakistan, wedding season (typically the cooler months) books up venues and vendors fastest, so if your date falls in peak season, aim to lock in your venue and photographer 6–12 months out. Off-season dates give you more flexibility and often better rates.\n\n" +
      "**Book your venue and photographer early — in that order.** Your venue determines your date, guest capacity, and decor constraints, so it comes first. Your photographer and videographer should be next, before caterers and decorators, because good studios get booked out months in advance for popular dates. Waiting until a few weeks before the wedding to look for a photographer usually means settling for whoever is still available, not who you'd actually choose.\n\n" +
      "**Plan each event with its own shot list in mind.** Nikah is intimate and paperwork-driven — plan for signing moments, close family portraits, and quiet reaction shots. Mehndi is colorful and high-energy — decor details, dance performances, and candid moments matter most. Barat is about grandeur — the groom's entrance, the couple's first moments together, and the stage. Walima is the most photographed event for most families — formal portraits, family groupings, and the reception itself. Share this breakdown with your photographer during consultation so coverage hours are allocated where you actually want them.\n\n" +
      "**Coordinate hair, makeup, and photography timing.** This is the most common scheduling mistake: outfits and makeup running late pushes back golden-hour portraits, drone coverage windows, or the Barat entrance itself. Build in buffer time between getting-ready and the ceremony, and share your makeup artist's contact with your photography team so timings can be coordinated directly.\n\n" +
      "**Confirm deliverables and delivery timelines in writing.** Before signing with any vendor, know exactly what you're getting: how many edited photos, whether a highlight film is included, how long albums take to arrive, and what the delivery window is. A clear agreement protects both sides and avoids disappointment months later when memories matter most.\n\n" +
      "**Don't forget the details that get missed under stress.** Confirm travel and accommodation for out-of-city guests early, keep a running list of vendor payment schedules and deposits, and delegate a trusted family member to handle day-of logistics so you can actually be present for your own wedding instead of managing it.\n\n" +
      "A Pakistani wedding is really four events stitched into one story. The couples who enjoy the process most are the ones who plan early, communicate clearly with every vendor, and leave enough breathing room in the schedule for things to run a little late — because in a celebration this size, something always does.",
  },
  {
    slug: "choose-wedding-photographer",
    title: "How to Choose the Right Wedding Photographer in Pakistan",
    excerpt: "Expert tips on evaluating portfolios, packages, and finding your perfect match.",
    image: "/portfolio/bridal-01-mirror-portrait.jpg",
    date: "June 1, 2026",
    dateISO: "2026-06-01",
    category: "Photography Tips",
    content:
      "Your wedding photographer is one of the few vendors whose work you'll still be looking at decades later. With dozens of studios advertising in every city, here's how to actually evaluate who's right for your day.\n\n" +
      "**Look at full galleries, not just highlight reels.** Instagram grids and showreels are curated to show only the best few seconds or frames from an entire event. Before booking, ask to see a full, unedited-order gallery from one complete wedding — ideally one similar in scale to yours. This tells you how consistent the work is across hundreds of real, unposed moments, not just the ten best shots.\n\n" +
      "**Match their style to what you actually want.** Editorial and cinematic are popular buzzwords, but styles vary a lot in practice — some studios lean toward candid documentary coverage, others toward posed, magazine-style portraits with heavy lighting and retouching. Look through several complete galleries and ask yourself which one matches how you want to remember your day, not just which looks most impressive as a single image.\n\n" +
      "**Ask about team size and who actually shoots your wedding.** Many studios book multiple weddings on the same weekend and send associate photographers rather than the person whose portfolio you were shown. Ask directly who will be on-site for your event, how many photographers and cinematographers are included, and whether that's guaranteed in writing.\n\n" +
      "**Understand what's included before comparing prices.** A lower quote often means fewer coverage hours, fewer edited photos, or no album included. When comparing packages, normalize for what you're actually getting: hours of coverage, number of shooters, edited photo count, whether a highlight film and drone coverage are included, and album quality. The cheapest package on paper is sometimes the most expensive once you add back what was left out.\n\n" +
      "**Check reviews and real client feedback, not just testimonials on the studio's own site.** Look at Google reviews, wedding marketplaces, and comments on real posts — patterns across many independent reviews tell you more than a handful of curated quotes ever will.\n\n" +
      "**Get everything in writing before you pay a deposit.** Your agreement should clearly state the date, coverage hours, deliverables, delivery timeline, payment schedule, and cancellation/rescheduling terms. A studio that's reluctant to put commitments in writing is telling you something important before you've paid anything.\n\n" +
      "**Meet or call before committing.** However good a portfolio looks, you'll be spending one of the most important days of your life alongside this team. A short call or in-person consultation tells you a lot about communication style, responsiveness, and whether they actually listen to what you want — which matters just as much as the equipment they carry.\n\n" +
      "The right photographer isn't necessarily the most expensive or the most followed on Instagram — it's the one whose real, complete work matches your taste, who is transparent about what's included, and who you trust to be calm and attentive on a day that will only happen once.",
  },
  {
    slug: "bridal-portrait-guide",
    title: "Bridal Portrait Guide: Posing, Lighting & Timing",
    excerpt: "Everything brides need to know for stunning editorial portraits.",
    image: "/portfolio/bridal-03-outdoor-tree.jpg",
    date: "May 20, 2026",
    dateISO: "2026-05-20",
    category: "Bridal Guides",
    content:
      "Bridal portraits are some of the most looked-at images from any wedding — they're the ones printed largest in albums, shared most on social media, and remembered longest. A little preparation on timing, lighting, and posing makes the difference between portraits that feel stiff and ones that feel effortless.\n\n" +
      "**Timing matters more than most brides expect.** The one to two hours around sunrise and sunset — golden hour — produce the softest, most flattering light, with warm tones and gentle shadows that suit most skin tones and outfit colors. If your portrait session can be scheduled around golden hour, even a simple location will look far more polished than a midday shoot in harsh overhead light. For indoor or studio sessions, ask your photographer what time of day their natural light is best, since window light shifts dramatically through the day.\n\n" +
      "**Coordinate with your makeup artist on timing, not just the look.** A rushed getting-ready sequence is the most common reason portrait sessions run late and lose their best light window. Share your photography start time with your makeup artist in advance, and build in 20–30 minutes of buffer — heavy bridal makeup and elaborate outfits almost always take longer than planned.\n\n" +
      "**Posing works best as movement, not held positions.** Static, stiffly-held poses tend to look tense in photos. Experienced photographers guide you through small movements — a slow turn, a soft laugh, adjusting your dupatta or jewelry — and capture the natural moment in between rather than a frozen pose. If you're nervous in front of the camera, tell your photographer directly; a good one will give you simple, specific directions (“look down, then slowly look back up”) rather than a vague “just be natural,” which is hard advice to follow on the day.\n\n" +
      "**Let your outfit and jewelry lead the composition.** Heavy bridal wear photographs differently than everyday clothing — trains, dupattas, and layered jewelry all need a moment to settle before a shot rather than being captured mid-movement. Simple additions like a slow spin to let a lehnga fall naturally, or a still beat after adjusting jewelry, give your photographer a much better window to capture detail shots that matter later — the handwork on your outfit, the earrings, the mehndi.\n\n" +
      "**Scout the location, or trust your photographer to.** Backgrounds with too much visual clutter compete with the bride rather than supporting her. Clean, simple backdrops — a plain wall, natural greenery, soft indoor light — usually photograph better than busy or highly decorated spaces. If you're shooting at a venue, a short walkthrough beforehand (in person or over photos/video call) helps identify the two or three spots that will actually work.\n\n" +
      "**Plan for both solo portraits and getting-ready coverage.** Some of the most treasured images from a wedding day end up being candid getting-ready moments — a mother adjusting her daughter's dupatta, a quiet moment before the ceremony — alongside the formal portraits. If these matter to you, say so explicitly when discussing coverage, since not every package includes dedicated getting-ready time.\n\n" +
      "Great bridal portraits come down to light, timing, and a little trust between you and your photographer — the technical side is their job, but showing up with a plan for timing and communicating what matters to you makes all the difference in what you get back.",
  },
  {
    slug: "behind-the-scenes-royal-studio",
    title: "Behind the Scenes: A Royal Studio Wedding Weekend",
    excerpt: "Go behind the lens with our team and see how a Royal Studio wedding weekend comes together, from first inquiry to final delivery.",
    image: "/team/team.webp",
    date: "May 5, 2026",
    dateISO: "2026-05-05",
    category: "Behind the Scenes",
    content:
      "Couples usually only see the finished gallery and film — the polished end result of a process that actually starts months before the wedding day itself. Here's what happens on our end, from the first message to the final delivery.\n\n" +
      "**It starts with a conversation, not a contract.** Every booking begins with a couple sharing their date, venue, and vision — sometimes over WhatsApp, sometimes as a form submission through the website. We follow up with a consultation to understand which events we're covering (Nikah, Mehndi, Barat, Walima, or a combination), the style the couple wants, and any specific shots or moments that matter most to their family. This is also when we walk through package options and answer questions honestly, including what isn't included, so there are no surprises later.\n\n" +
      "**Booking locks in the date, but planning is where the details get sorted.** Once a couple signs and secures their date with a deposit, our team moves into detailed planning: confirming venue logistics, coordinating timing with makeup artists and event planners, and building a rough shot list per event so coverage time is spent where it matters most. For multi-day, multi-city weddings, this stage also covers travel and equipment logistics for our team.\n\n" +
      "**On the wedding day itself, the team works in parallel, not in sequence.** A typical event has photographers covering formal portraits and candid moments simultaneously, a cinematographer capturing ceremony audio and multi-camera footage, and — where the venue and weather allow — drone coverage for aerial shots of the venue and procession. With a team of 10–15 members across our studio, we can scale coverage up for multi-day, multi-venue celebrations without stretching any one person too thin.\n\n" +
      "**The real work often begins after the wedding ends.** Once footage and photos are in, our editing team culls thousands of raw frames down to the couple's final edited gallery, color-grades and retouches selected images, and begins assembling the wedding film — syncing audio, cutting for pace, and licensing music. This stage is where a wedding day's worth of raw material becomes a coherent story, and it's usually the longest part of the process.\n\n" +
      "**Album design closes the loop.** For couples who've chosen a luxury album, our team lays out spreads that tell the day's story in sequence — not just a random selection of favorites — before sending proofs for approval and moving to print.\n\n" +
      "**Delivery is the moment it all comes together.** Our standard turnaround is within 20 days for photo galleries and films, with faster delivery available on select packages. Couples get their online gallery first, followed by their film and any physical albums as those are completed.\n\n" +
      "None of this happens in isolation — every wedding we shoot involves consultation, planning, a coordinated team on the day, and weeks of editing before a couple ever sees the final result. It's a longer process than most people expect, but it's also why the final gallery holds up when a couple looks back on it years later.",
  },
];

export const blogCategories = [
  "All",
  "Wedding Planning",
  "Photography Tips",
  "Bridal Guides",
  "Behind the Scenes",
];

export const pageKeywords = {
  home: {
    primary: "Luxury Wedding Photographer Burewala",
    secondary: [
      "Wedding Photographer & Cinematographer Pakistan",
      "Nikah Mehndi Barat Walima Photography",
      "Wedding Photographer Serving Vehari & Multan",
      "Cinematic Wedding Films Pakistan",
    ],
  },
  about: {
    primary: "Wedding Photography Studio Burewala",
    secondary: [
      "Luxury Wedding Photographers Pakistan",
      "Royal Studio Founders Muhammad Ramzan Talha Ramay",
      "Professional Wedding Photography Team Punjab",
    ],
  },
  services: {
    primary: "Wedding Photography & Cinematography Services Pakistan",
    secondary: [
      "Nikah Photography Burewala",
      "Mehndi Photography Vehari",
      "Barat Cinematography Multan",
      "Walima Photography Sahiwal",
      "Bridal Portrait Photographer Punjab",
      "Fashion & Corporate Event Photography Pakistan",
    ],
  },
  pricing: {
    primary: "Wedding Photography Packages Pakistan",
    secondary: [
      "Wedding Photography Price PKR Burewala",
      "Affordable Luxury Wedding Photographer Pakistan",
      "Nikah Barat Walima Photography Package",
      "Wedding Photography Prices 2026",
    ],
  },
  portfolio: {
    primary: "Wedding Photography Portfolio Pakistan",
    secondary: [
      "Bridal Portrait Gallery Punjab",
      "Nikah Mehndi Barat Walima Photo Gallery",
      "Wedding Photography Portfolio Multan Lahore Islamabad",
    ],
  },
  weddingFilms: {
    primary: "Cinematic Wedding Films Pakistan",
    secondary: [
      "Wedding Highlight Film Burewala",
      "Wedding Trailer Videographer Punjab",
      "Documentary Style Wedding Film Pakistan",
      "Barat Cinematography Drone Coverage",
    ],
  },
  blog: {
    primary: "Wedding Planning & Photography Guides Pakistan",
    secondary: [
      "Wedding Planning Checklist Pakistan",
      "How to Choose a Wedding Photographer",
      "Bridal Portrait Tips",
      "Behind the Scenes Wedding Photography",
    ],
  },
  contact: {
    primary: "Book Wedding Photographer Burewala",
    secondary: [
      "Contact Luxury Wedding Photography Studio Punjab",
      "Wedding Photographer Burewala Vehari Multan",
    ],
  },
} as const;

export const heroVideoId = "QF3BmojTrKQ";

export const heroPoster = `https://img.youtube.com/vi/${heroVideoId}/maxresdefault.jpg`;
