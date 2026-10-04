import { NextResponse } from 'next/server';
import { dbInstance, getDefaultStudioProfile, verifyPassword, hashPassword } from '@/lib/admin/db';
import { computeInvoiceStatus } from '@/components/admin/utils/calculations';
import { User, AuditLogEntry } from '@/components/admin/types';
import { GoogleGenAI } from '@google/genai';
import {
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
} from '@/lib/data';
import { optimizePortfolioImageServer } from '@/lib/imageOptimizer';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;

function sanitizeHexColor(val: unknown, fallback: string): string {
  if (typeof val === 'string' && HEX_COLOR_REGEX.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (bearer) return bearer;
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const part of cookies) {
      const [rawKey, ...rest] = part.trim().split('=');
      if (rawKey === 'royal_studio_session') {
        const val = decodeURIComponent(rest.join('=')).trim();
        if (val) return val;
      }
    }
  }
  return null;
}

export function getAuthUser(req: Request): User | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  const session = dbInstance.getSession(token);
  if (!session) return null;

  const db = dbInstance.getData();
  const user = db.users.find(
    u => u.id === session.userId && u.status !== 'DISABLED'
  );
  return user || null;
}

function parseJsonBody(req: Request): Promise<any> {
  return req.json().catch(() => ({}));
}

export async function handleAdminApi(req: Request, slug: string[]): Promise<Response> {
  const method = req.method.toUpperCase();
  const pathStr = slug.join('/');

  const db = await dbInstance.ensureHydrated();
  const user = getAuthUser(req);
  const isAdmin = user?.role === 'ADMIN';

  const requireAuthCheck = () => {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    return null;
  };

  const requireAdminCheck = () => {
    const authErr = requireAuthCheck();
    if (authErr) return authErr;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }
    return null;
  };

  const recordAdminAudit = (
    section: string,
    changedFields: string[],
    summary: string
  ) => {
    if (!db.profileAuditLogs) db.profileAuditLogs = [];
    const entry: AuditLogEntry = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'usr-admin',
      userName: user?.name || 'Royal Studio',
      userRole: user?.role || 'ADMIN',
      section,
      changedFields,
      summary,
    };
    db.profileAuditLogs.unshift(entry);
    if (db.profileAuditLogs.length > 200) {
      db.profileAuditLogs = db.profileAuditLogs.slice(0, 200);
    }
  };

  // ================= AUTH ROUTES =================
  if (pathStr === 'auth/login' && method === 'POST') {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local-client';
    const now = Date.now();
    const attemptState = loginAttempts.get(clientIp);
    if (attemptState && attemptState.resetAt > now && attemptState.count >= MAX_LOGIN_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many failed sign-in attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const { email, username, password } = await parseJsonBody(req);
    const identifier = ((email || username || '') as string).toLowerCase().trim();
    const inputPassword = (password || '').trim();

    if (!identifier || !inputPassword) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Match user by exact email or by domain alias (@royalstudio.online <-> @royalstudio.pk)
    const normalizedPrefix = identifier.split('@')[0];
    const isRoyalDomain =
      identifier.endsWith('@royalstudio.online') || identifier.endsWith('@royalstudio.pk');

    const matchedUser = db.users.find(u => {
      const userEmail = u.email.toLowerCase().trim();
      if (userEmail === identifier) return true;
      if (
        isRoyalDomain &&
        (userEmail === `${normalizedPrefix}@royalstudio.online` ||
          userEmail === `${normalizedPrefix}@royalstudio.pk`)
      ) {
        return true;
      }
      return false;
    });

    const isPasswordValid =
      Boolean(matchedUser) && verifyPassword(inputPassword, matchedUser?.password);

    if (!matchedUser || !isPasswordValid) {
      const prev = loginAttempts.get(clientIp);
      loginAttempts.set(clientIp, {
        count: prev && prev.resetAt > now ? prev.count + 1 : 1,
        resetAt: now + LOGIN_WINDOW_MS,
      });
      return NextResponse.json(
        { error: 'Invalid email or password. Please verify your credentials and try again.' },
        { status: 401 }
      );
    }

    loginAttempts.delete(clientIp);

    if (matchedUser.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'This user account has been disabled. Please contact the Royal Studio Administrator.' },
        { status: 403 }
      );
    }

    const token = `token-${matchedUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const maxAgeSec = 30 * 24 * 60 * 60;
    const sessionRecord = {
      userId: matchedUser.id,
      expiresAt: Date.now() + maxAgeSec * 1000,
      lastActiveAt: Date.now(),
    };
    dbInstance.setSession(token, sessionRecord);

    const { password: _, ...userSafe } = matchedUser;
    const response = NextResponse.json({ token, user: userSafe });
    response.headers.set(
      'Set-Cookie',
      `royal_studio_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`
    );
    return response;
  }

  if (pathStr === 'auth/me' && method === 'GET') {
    if (!user) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }
    const { password: _, ...userSafe } = user;
    return NextResponse.json({ user: userSafe });
  }

  if (pathStr === 'auth/logout' && method === 'POST') {
    const token = extractSessionToken(req);
    if (token) {
      dbInstance.deleteSession(token);
    }
    const response = NextResponse.json({ success: true });
    response.headers.set(
      'Set-Cookie',
      'royal_studio_session=; Path=/; Max-Age=0; SameSite=Lax'
    );
    return response;
  }

  // ================= USER & STAFF ACCOUNT MANAGEMENT =================
  if (pathStr === 'users' && method === 'GET') {
    const err = requireAdminCheck();
    if (err) return err;
    const safeUsers = db.users.map(({ password: _, ...u }) => u);
    return NextResponse.json(safeUsers);
  }

  if (pathStr === 'users/staff' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const { teamMemberId, email, password, name, phone } = await parseJsonBody(req);
    if (!teamMemberId || !email || !password) {
      return NextResponse.json({ error: 'Team member, email, and password are required.' }, { status: 400 });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ error: 'A login account with this email address already exists.' }, { status: 400 });
    }
    const teamMember = db.teamMembers.find(t => t.id === teamMemberId);
    if (!teamMember) {
      return NextResponse.json({ error: 'Target team member not found.' }, { status: 404 });
    }
    const newUser: User = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || teamMember.name,
      email: cleanEmail,
      role: 'STAFF',
      status: 'ACTIVE',
      linkedTeamMemberId: teamMember.id,
      phone: phone || teamMember.phone,
      password: hashPassword(String(password).trim()),
      createdDate: new Date().toISOString(),
    };
    db.users.push(newUser);
    teamMember.hasLogin = true;
    teamMember.userId = newUser.id;
    teamMember.loginStatus = 'ACTIVE';
    dbInstance.save();
    const { password: _, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  }

  if (slug[0] === 'users' && slug[2] === 'status' && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const { status } = await parseJsonBody(req);
    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (targetUser.role === 'ADMIN' && status === 'DISABLED') {
      return NextResponse.json({ error: 'The primary Royal Studio Administrator account cannot be disabled.' }, { status: 400 });
    }
    targetUser.status = status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
    if (targetUser.status === 'DISABLED' && db.sessions) {
      for (const [token, session] of Object.entries(db.sessions)) {
        if (session.userId === targetUser.id) delete db.sessions[token];
      }
    }
    if (targetUser.linkedTeamMemberId) {
      const tm = db.teamMembers.find(t => t.id === targetUser.linkedTeamMemberId);
      if (tm) tm.loginStatus = targetUser.status;
    }
    dbInstance.save();
    const { password: _, ...safeUser } = targetUser;
    return NextResponse.json(safeUser);
  }

  if (slug[0] === 'users' && slug[2] === 'password' && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const { password } = await parseJsonBody(req);
    if (!password || String(password).trim().length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
    }
    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    targetUser.password = hashPassword(String(password).trim());
    dbInstance.save();
    return NextResponse.json({ success: true, message: `Password updated successfully for ${targetUser.name}` });
  }

  if (slug[0] === 'users' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const userIdx = db.users.findIndex(u => u.id === id);
    if (userIdx === -1) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (db.users[userIdx].role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete the primary Royal Studio Administrator account.' }, { status: 400 });
    }
    const deletedUser = db.users.splice(userIdx, 1)[0];
    if (db.sessions) {
      for (const [token, session] of Object.entries(db.sessions)) {
        if (session.userId === deletedUser.id) delete db.sessions[token];
      }
    }
    if (deletedUser.linkedTeamMemberId) {
      const tm = db.teamMembers.find(t => t.id === deletedUser.linkedTeamMemberId);
      if (tm) {
        tm.hasLogin = false;
        delete tm.userId;
        delete tm.loginStatus;
      }
    }
    dbInstance.save();
    return NextResponse.json({ success: true, message: 'User account removed.' });
  }

  // ================= STAFF OWN PROFILE UPDATE =================
  if (pathStr === 'me/profile' && method === 'PUT') {
    const err = requireAuthCheck();
    if (err) return err;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await parseJsonBody(req);
    const {
      name,
      phone,
      whatsapp,
      specialization,
      availabilityStatus,
      notes,
      newPassword,
    } = body;

    const targetUser = db.users.find(u => u.id === user.id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const updatedFields: string[] = [];
    if (typeof name === 'string' && name.trim()) {
      targetUser.name = name.trim();
      updatedFields.push('name');
    }
    if (typeof phone === 'string') {
      targetUser.phone = phone.trim();
      updatedFields.push('phone');
    }
    if (typeof newPassword === 'string' && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return NextResponse.json(
          { error: 'New password must be at least 4 characters long.' },
          { status: 400 }
        );
      }
      targetUser.password = hashPassword(newPassword.trim());
      updatedFields.push('password');
    }

    const linkedTm = db.teamMembers.find(
      tm =>
        tm.id === targetUser.linkedTeamMemberId ||
        tm.userId === targetUser.id ||
        tm.name.toLowerCase() === user.name.toLowerCase()
    );

    if (linkedTm) {
      if (typeof name === 'string' && name.trim()) linkedTm.name = name.trim();
      if (typeof phone === 'string') linkedTm.phone = phone.trim();
      if (typeof whatsapp === 'string') {
        linkedTm.whatsapp = whatsapp.trim();
        updatedFields.push('whatsapp');
      }
      if (typeof specialization === 'string') {
        linkedTm.specialization = specialization.trim();
        updatedFields.push('specialization');
      }
      if (
        availabilityStatus === 'Available' ||
        availabilityStatus === 'Busy' ||
        availabilityStatus === 'On Leave'
      ) {
        linkedTm.availabilityStatus = availabilityStatus;
        updatedFields.push('availabilityStatus');
      }
      if (typeof notes === 'string') {
        linkedTm.notes = notes.trim();
        updatedFields.push('notes');
      }
    }

    recordAdminAudit(
      'Staff Profile',
      updatedFields.length ? updatedFields : ['profile'],
      `${targetUser.name} (${targetUser.role}) updated their personal profile (${updatedFields.join(', ') || 'details'}).`
    );

    dbInstance.save();
    const { password: _, ...safeUser } = targetUser;
    return NextResponse.json({
      user: safeUser,
      teamMember: linkedTm ? { ...linkedTm, dailyRate: 0, eventRate: 0 } : null,
    });
  }

  // ================= ALL DATA FETCH =================
  if (pathStr === 'db/all' && method === 'GET') {
    const err = requireAuthCheck();
    if (err) return err;

    const isStaff = user?.role === 'STAFF';
    if (isStaff && user) {
      const linkedTm = db.teamMembers.find(
        tm =>
          tm.id === user.linkedTeamMemberId ||
          tm.userId === user.id ||
          tm.name.toLowerCase() === user.name.toLowerCase()
      );
      const staffTmId = linkedTm?.id;
      const myAssignments = staffTmId
        ? db.teamAssignments
            .filter(a => a.teamMemberId === staffTmId && a.assignmentStatus !== 'Cancelled')
            .map(a => ({
              ...a,
              rate: 0,
              cost: 0,
              notes: '',
            }))
        : [];

      const myTasks = db.tasks.filter(
        t =>
          (staffTmId && t.assigneeId === staffTmId) ||
          (user.linkedTeamMemberId && t.assigneeId === user.linkedTeamMemberId)
      );

      // Include events from both direct crew assignments and assigned tasks
      const myEventIds = new Set<string>([
        ...myAssignments.map(a => a.eventId),
        ...myTasks.map(t => t.eventId),
      ]);

      // Strictly expose ONLY event name, date, location (venue & city), and time to Staff
      const myEvents = db.events
        .filter(e => myEventIds.has(e.id) && e.status !== 'Cancelled')
        .map(e => ({
          id: e.id,
          title: e.title,
          eventDate: e.eventDate,
          startTime: e.startTime || '18:00',
          endTime: e.endTime || '23:00',
          venue: e.venue || '',
          city: e.city || '',
          category: e.category,
          status: e.status,
          clientId: '',
          packagePrice: 0,
          advancePaid: 0,
          discount: 0,
          tax: 0,
          notes: '',
          createdBy: '',
          createdDate: '',
          updatedDate: '',
          isMultiDay: false,
          staffCost: 0,
          rentalCost: 0,
          eventExpenses: 0,
          netProfit: 0,
          netMargin: 0,
          totalClientPayments: 0,
          remainingBalance: 0,
        }));

      const myEquipmentAssignments = db.equipmentAssignments
        .filter(ea => myEventIds.has(ea.eventId))
        .map(ea => ({
          ...ea,
          rentalRate: 0,
          rentalCost: 0,
          notes: '',
        }));
      const myEquipmentIds = new Set(myEquipmentAssignments.map(ea => ea.equipmentId));
      const myEquipment = db.equipment
        .filter(eq => myEquipmentIds.has(eq.id))
        .map(eq => ({
          ...eq,
          rentalRate: 0,
        }));

      return NextResponse.json({
        profile: {
          studioName: db.profile.studioName,
          tagline: db.profile.tagline,
          city: db.profile.city,
          logo: db.profile.logo,
          primaryLogo: db.profile.primaryLogo,
          themeConfig: db.profile.themeConfig,
        },
        users: [],
        clients: [],
        events: myEvents,
        daySchedules: [],
        packages: [],
        teamMembers: linkedTm ? [{ ...linkedTm, dailyRate: 0, eventRate: 0 }] : [],
        teamAssignments: myAssignments,
        teamPayments: [],
        equipment: myEquipment,
        equipmentAssignments: myEquipmentAssignments,
        maintenanceLogs: [],
        eventExpenses: [],
        studioExpenses: [],
        invoices: [],
        payments: [],
        quotations: [],
        tasks: myTasks,
        tempHireRecommendations: [],
      });
    }

    // Admin view
    const enrichedTeamMembers = db.teamMembers.map(tm => {
      const linkedUser = db.users.find(
        u => u.linkedTeamMemberId === tm.id || (u.role === 'STAFF' && u.name.toLowerCase() === tm.name.toLowerCase())
      );
      return {
        ...tm,
        hasLogin: !!linkedUser,
        userId: linkedUser?.id,
        loginStatus: linkedUser?.status || (linkedUser ? 'ACTIVE' : undefined),
      };
    });

    return NextResponse.json({
      profile: db.profile,
      profileAuditLogs: db.profileAuditLogs || [],
      cms: db.cms,
      users: db.users.map(({ password: _, ...u }) => u),
      clients: db.clients,
      events: db.events,
      daySchedules: db.daySchedules,
      packages: db.packages,
      teamMembers: enrichedTeamMembers,
      teamAssignments: db.teamAssignments,
      teamPayments: db.teamPayments,
      equipment: db.equipment,
      equipmentAssignments: db.equipmentAssignments,
      maintenanceLogs: db.maintenanceLogs,
      eventExpenses: db.eventExpenses,
      studioExpenses: db.studioExpenses,
      invoices: db.invoices,
      payments: db.payments,
      quotations: db.quotations,
      tasks: db.tasks,
      tempHireRecommendations: db.tempHireRecommendations,
    });
  }

  // ================= DATABASE ENGINE & BACKUP MANAGEMENT =================
  if (pathStr === 'db/info' && method === 'GET') {
    const err = requireAdminCheck();
    if (err) return err;
    return NextResponse.json(dbInstance.getEngineStats());
  }

  if (pathStr === 'db/export' && method === 'GET') {
    const err = requireAdminCheck();
    if (err) return err;
    const { users: _u, sessions: _s, ...exportable } = db;
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      engine: dbInstance.getEngineStats().driverName,
      data: exportable,
    });
  }

  if (pathStr === 'db/import' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const payload = body?.data && typeof body.data === 'object' ? body.data : body;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid database backup file.' }, { status: 400 });
    }
    await dbInstance.importDatabase(payload);
    return NextResponse.json({
      success: true,
      stats: dbInstance.getEngineStats(),
    });
  }

  // ================= PUBLIC WEBSITE & PORTFOLIO CMS =================
  if (pathStr === 'cms' && method === 'GET') {
    if (!db.cms) {
      db.cms = {
        portfolioItems: [...defaultPortfolioItems],
        pricingPackages: [...defaultPricingPackages],
        detailedServices: [...defaultDetailedServices],
        testimonials: [...defaultTestimonials],
        blogPosts: [...defaultBlogPosts],
        websiteLeads: [],
      };
      dbInstance.save();
    }
    if (isAdmin) {
      return NextResponse.json(db.cms);
    }
    // Redact private client inquiry leads from unauthenticated public CMS fetches
    return NextResponse.json({
      ...db.cms,
      websiteLeads: [],
    });
  }

  if (pathStr === 'cms' && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    if (!db.cms) {
      db.cms = {
        portfolioItems: [...defaultPortfolioItems],
        pricingPackages: [...defaultPricingPackages],
        detailedServices: [...defaultDetailedServices],
        testimonials: [...defaultTestimonials],
        blogPosts: [...defaultBlogPosts],
        websiteLeads: [],
      };
    }
    if (Array.isArray(body.portfolioItems)) {
      const optimizedItems = await Promise.all(
        body.portfolioItems.map(async (item: any) => {
          if (typeof item?.image === 'string' && item.image.startsWith('data:image/')) {
            try {
              const opt = await optimizePortfolioImageServer(item.image, {
                title: item.title,
                category: item.category,
                preferredFormat: 'webp',
              });
              return {
                ...item,
                image: opt.url,
                aspect: item.aspect || opt.aspect,
              };
            } catch {
              return item;
            }
          }
          return item;
        })
      );
      db.cms.portfolioItems = optimizedItems;
    }
    if (Array.isArray(body.pricingPackages)) db.cms.pricingPackages = body.pricingPackages;
    if (Array.isArray(body.detailedServices)) db.cms.detailedServices = body.detailedServices;
    if (Array.isArray(body.testimonials)) db.cms.testimonials = body.testimonials;
    if (Array.isArray(body.blogPosts)) {
      const optimizedPosts = await Promise.all(
        body.blogPosts.map(async (post: any) => {
          if (typeof post?.image === 'string' && post.image.startsWith('data:image/')) {
            try {
              const opt = await optimizePortfolioImageServer(post.image, {
                title: post.title,
                category: 'blog',
                preferredFormat: 'webp',
              });
              return {
                ...post,
                image: opt.url,
              };
            } catch {
              return post;
            }
          }
          return post;
        })
      );
      db.cms.blogPosts = optimizedPosts;
    }
    if (Array.isArray(body.websiteLeads)) db.cms.websiteLeads = body.websiteLeads;
    dbInstance.save();
    return NextResponse.json(db.cms);
  }

  if (pathStr === 'cms/reset' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    db.cms = {
      portfolioItems: [...defaultPortfolioItems],
      pricingPackages: [...defaultPricingPackages],
      detailedServices: [...defaultDetailedServices],
      testimonials: [...defaultTestimonials],
      blogPosts: [...defaultBlogPosts],
      websiteLeads: db.cms?.websiteLeads || [],
    };
    dbInstance.save();
    return NextResponse.json(db.cms);
  }

  // ================= THEME & APPEARANCE PERSISTENCE =================
  if (pathStr === 'theme' && method === 'GET') {
    const defaultProf = getDefaultStudioProfile();
    return NextResponse.json(db.profile.themeConfig || defaultProf.themeConfig);
  }

  if (pathStr === 'theme' && method === 'PUT') {
    const body = await parseJsonBody(req);
    const defaultProf = getDefaultStudioProfile();
    const currentTheme = db.profile.themeConfig || defaultProf.themeConfig!;

    const bodyKeys = Object.keys(body || {});
    const isOnlyModeToggle = bodyKeys.length === 1 && bodyKeys[0] === 'mode';

    // Modifying brand colors, border-radius, or typography globally requires Admin privileges
    if (!isOnlyModeToggle) {
      const err = requireAdminCheck();
      if (err) return err;
    }

    const allowedModes = ['light', 'dark', 'system'] as const;
    const allowedRadius = ['sharp', 'editorial', 'rounded'] as const;
    const allowedHeadingFonts = [
      'Cormorant Garamond',
      'Playfair Display',
      'Cinzel',
      'Inter',
    ] as const;
    const allowedBodyFonts = ['Inter', 'Poppins'] as const;
    const allowedSidebars = ['obsidian', 'editorial', 'glass'] as const;

    const updatedTheme = {
      ...currentTheme,
      mode: allowedModes.includes(body.mode) ? body.mode : currentTheme.mode,
      ...(isAdmin
        ? {
            presetId:
              typeof body.presetId === 'string'
                ? body.presetId.slice(0, 40)
                : currentTheme.presetId,
            accentColor: sanitizeHexColor(body.accentColor, currentTheme.accentColor),
            accentLight: sanitizeHexColor(body.accentLight, currentTheme.accentLight),
            accentDark: sanitizeHexColor(body.accentDark, currentTheme.accentDark),
            primaryColor: sanitizeHexColor(body.primaryColor, currentTheme.primaryColor),
            backgroundLight: sanitizeHexColor(
              body.backgroundLight,
              currentTheme.backgroundLight
            ),
            surfaceLight: sanitizeHexColor(body.surfaceLight, currentTheme.surfaceLight),
            backgroundDark: sanitizeHexColor(body.backgroundDark, currentTheme.backgroundDark),
            surfaceDark: sanitizeHexColor(body.surfaceDark, currentTheme.surfaceDark),
            sidebarStyle: allowedSidebars.includes(body.sidebarStyle)
              ? body.sidebarStyle
              : currentTheme.sidebarStyle,
            headingFont: allowedHeadingFonts.includes(body.headingFont)
              ? body.headingFont
              : currentTheme.headingFont,
            bodyFont: allowedBodyFonts.includes(body.bodyFont)
              ? body.bodyFont
              : currentTheme.bodyFont,
            borderRadius: allowedRadius.includes(body.borderRadius)
              ? body.borderRadius
              : currentTheme.borderRadius,
            borderRadiusPx:
              typeof body.borderRadiusPx === 'number' && !Number.isNaN(body.borderRadiusPx)
                ? Math.max(0, Math.min(32, Math.round(body.borderRadiusPx)))
                : currentTheme.borderRadiusPx,
            applyToPublicWebsite:
              typeof body.applyToPublicWebsite === 'boolean'
                ? body.applyToPublicWebsite
                : currentTheme.applyToPublicWebsite,
          }
        : {}),
    };
    db.profile.themeConfig = updatedTheme;

    if (user && isAdmin && !isOnlyModeToggle) {
      if (!db.profileAuditLogs) db.profileAuditLogs = [];
      db.profileAuditLogs.unshift({
        id: `audit-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        section: 'Admin Theme Customizer',
        changedFields: bodyKeys,
        summary: `Updated global studio theme (${updatedTheme.presetId || 'custom'} · ${updatedTheme.mode} mode · accent ${updatedTheme.accentColor}).`,
      });
    }

    dbInstance.save();
    return NextResponse.json({
      themeConfig: db.profile.themeConfig,
      profile: db.profile,
    });
  }

  // ================= PROFILE =================
  if (pathStr === 'profile' && method === 'GET') {
    if (isAdmin) {
      return NextResponse.json(db.profile);
    }
    return NextResponse.json({
      ...db.profile,
      bankAccounts: (db.profile.bankAccounts || []).filter(b => b.showPublicly && b.isActive),
      paymentMethods: (db.profile.paymentMethods || []).filter(m => m.showPublicly && m.isActive),
    });
  }

  if (pathStr === 'profile/audit-logs' && method === 'GET') {
    const err = requireAdminCheck();
    if (err) return err;
    return NextResponse.json(db.profileAuditLogs || []);
  }

  if (pathStr === 'profile/reset' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const defaultProf = getDefaultStudioProfile();
    db.profile = defaultProf;
    if (!db.profileAuditLogs) db.profileAuditLogs = [];
    const logEntry: AuditLogEntry = {
      id: `audit-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'usr-admin',
      userName: user?.name || 'Royal Studio',
      userRole: user?.role || 'ADMIN',
      section: 'Full Studio Profile Reset',
      changedFields: ['all'],
      summary: 'Restored official Royal Studio profile settings to Burewala factory defaults.'
    };
    db.profileAuditLogs.unshift(logEntry);
    dbInstance.save();
    return NextResponse.json({ profile: db.profile, auditLogs: db.profileAuditLogs });
  }

  if (pathStr === 'profile' && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { _auditSection, ...updates } = body;

    const changedFields: string[] = [];
    for (const [k, v] of Object.entries(updates)) {
      const prevVal = (db.profile as any)[k];
      if (JSON.stringify(prevVal) !== JSON.stringify(v)) {
        changedFields.push(k);
      }
    }

    const merged = { ...db.profile, ...updates };

    // Keep primary bank fields in sync with default bankAccount if bankAccounts array is present
    if (Array.isArray(merged.bankAccounts) && merged.bankAccounts.length > 0) {
      const defaultAcc = merged.bankAccounts.find((b: any) => b.isDefault && b.isActive) || merged.bankAccounts[0];
      if (defaultAcc) {
        merged.bankName = defaultAcc.bankName || merged.bankName;
        merged.accountTitle = defaultAcc.accountTitle || merged.accountTitle;
        merged.accountNumber = defaultAcc.accountNumber || merged.accountNumber;
        merged.iban = defaultAcc.iban || merged.iban;
      }
    }

    db.profile = merged;

    if (changedFields.length > 0) {
      if (!db.profileAuditLogs) db.profileAuditLogs = [];
      const logEntry: AuditLogEntry = {
        id: `audit-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        userId: user?.id || 'usr-admin',
        userName: user?.name || 'Royal Studio',
        userRole: user?.role || 'ADMIN',
        section: _auditSection || 'Studio Profile Update',
        changedFields,
        summary: `Updated ${changedFields.length} field(s): ${changedFields.slice(0, 6).join(', ')}${changedFields.length > 6 ? '...' : ''}`
      };
      db.profileAuditLogs.unshift(logEntry);
      if (db.profileAuditLogs.length > 100) {
        db.profileAuditLogs = db.profileAuditLogs.slice(0, 100);
      }
    }

    dbInstance.save();
    return NextResponse.json(db.profile);
  }

  // ================= CLIENTS =================
  if (pathStr === 'clients' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const { name, phone, whatsapp, email, address, city, notes } = await parseJsonBody(req);
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and Phone are required' }, { status: 400 });
    }
    const duplicate = db.clients.find(c => c.phone === phone || c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      return NextResponse.json({ error: 'A client with this phone number or name already exists.' }, { status: 400 });
    }
    const newClient = {
      id: `cli-${Date.now().toString().slice(-6)}`,
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || '',
      address: address || '',
      city: city || 'Burewala',
      notes: notes || '',
      createdDate: new Date().toISOString(),
      createdBy: user?.id || 'usr-admin',
    };
    db.clients.unshift(newClient);
    dbInstance.save();
    return NextResponse.json(newClient);
  }

  if (slug[0] === 'clients' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.clients.findIndex(c => c.id === id);
    if (index === -1) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    db.clients[index] = { ...db.clients[index], ...body };
    dbInstance.save();
    return NextResponse.json(db.clients[index]);
  }

  if (slug[0] === 'clients' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const hasEvents = db.events.some(e => e.clientId === id);
    if (hasEvents) {
      return NextResponse.json({ error: 'Cannot delete client with existing events. Remove or reassign events first.' }, { status: 400 });
    }
    db.clients = db.clients.filter(c => c.id !== id);
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= EVENTS =================
  if (pathStr === 'events' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { clientId, title, category, weddingSubtype, packageId, eventDate, startTime, endTime, venue, city, packagePrice, advancePaid, discount, tax, notes, isMultiDay } = body;
    if (!clientId || !title || !eventDate) {
      return NextResponse.json({ error: 'Client, Title, and Event Date are required.' }, { status: 400 });
    }
    const priceNum = Number(packagePrice || 0);
    const advNum = Number(advancePaid || 0);
    const newEvent = {
      id: `evt-${Date.now().toString().slice(-6)}`,
      clientId,
      title,
      category: category || 'Wedding',
      weddingSubtype,
      packageId,
      eventDate,
      startTime: startTime || '18:00',
      endTime: endTime || '23:00',
      venue: venue || 'Burewala',
      city: city || 'Burewala',
      status: (body.status || 'Confirmed') as any,
      packagePrice: priceNum,
      advancePaid: advNum,
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      notes: notes || '',
      createdBy: user?.id || 'usr-admin',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      isMultiDay: !!isMultiDay,
      staffCost: 0,
      rentalCost: 0,
      eventExpenses: 0,
      netProfit: priceNum,
      netMargin: priceNum > 0 ? 100 : 0,
      totalClientPayments: 0,
      remainingBalance: priceNum,
    };
    db.events.unshift(newEvent);

    if (advNum > 0) {
      const payment = {
        id: `pay-${Date.now().toString().slice(-6)}`,
        paymentId: `PAY-${Date.now().toString().slice(-4)}`,
        eventId: newEvent.id,
        amount: advNum,
        paymentDate: eventDate,
        method: 'Bank Transfer' as any,
        reference: 'Booking Advance Deposit',
        notes: 'Initial booking advance payment',
        createdBy: user?.id || 'usr-admin',
      };
      db.payments.unshift(payment);
    }

    const quoNumber = `${db.profile.quotationPrefix}${String(db.quotations.length + 1001).padStart(4, '0')}`;
    const newQuo = {
      id: `quo-${Date.now().toString().slice(-6)}`,
      quotationNumber: quoNumber,
      clientId,
      eventId: newEvent.id,
      issueDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: priceNum,
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      total: priceNum - Number(discount || 0) + Number(tax || 0),
      paymentTerms: db.profile.paymentTerms,
      notes: 'Official studio proposal and agreement.',
      createdBy: user?.id || 'usr-admin',
    };
    db.quotations.unshift(newQuo);

    // Automatic Resource & Equipment Allocation on Event Scheduling
    const autoAllocate = body.autoAllocateResources !== false;
    const explicitEqIds: string[] = Array.isArray(body.selectedEquipmentIds)
      ? body.selectedEquipmentIds
      : [];
    const explicitCrewIds: string[] = Array.isArray(body.selectedCrewIds)
      ? body.selectedCrewIds
      : [];

    if (autoAllocate) {
      const sameDayEventIds = new Set(
        db.events
          .filter(e => e.id !== newEvent.id && e.eventDate === eventDate && e.status !== 'Cancelled')
          .map(e => e.id)
      );

      // 1. Allocate Equipment (either explicit selection or automatic essential kit)
      const gearToAssign = db.equipment.filter(eq => explicitEqIds.includes(eq.id));
      if (gearToAssign.length === 0) {
        const busyEqIds = new Set(
          db.equipmentAssignments
            .filter(ea => sameDayEventIds.has(ea.eventId) && !ea.isCheckedIn)
            .map(ea => ea.equipmentId)
        );
        const availableGear = db.equipment.filter(
          eq => eq.status !== 'Maintenance' && !busyEqIds.has(eq.id)
        );
        const pickedCategories = new Set<string>();
        for (const eq of availableGear) {
          if (!pickedCategories.has(eq.category) && gearToAssign.length < 4) {
            pickedCategories.add(eq.category);
            gearToAssign.push(eq);
          }
        }
      }

      gearToAssign.forEach((eq, idx) => {
        db.equipmentAssignments.push({
          id: `eqa-${Date.now().toString().slice(-5)}-${idx}`,
          eventId: newEvent.id,
          equipmentId: eq.id,
          quantity: 1,
          rentalRate: eq.rentalRate || 0,
          rentalCost: eq.rentalRate || 0,
          isCheckedOut: false,
          isCheckedIn: false,
          notes: 'Auto-reserved via Calendar Booking',
        });
      });

      // 2. Allocate Crew (if explicitCrewIds provided or package has requirements)
      let crewToAssign = db.teamMembers.filter(tm => explicitCrewIds.includes(tm.id));
      if (crewToAssign.length === 0 && packageId) {
        const pkg = db.packages.find(p => p.id === packageId);
        const busyCrewIds = new Set(
          db.teamAssignments
            .filter(ta => sameDayEventIds.has(ta.eventId) && ta.assignmentStatus !== 'Cancelled')
            .map(ta => ta.teamMemberId)
        );
        const availableCrew = db.teamMembers.filter(
          tm => tm.isActive && tm.availabilityStatus === 'Available' && !busyCrewIds.has(tm.id)
        );
        if (pkg) {
          const photogs = availableCrew
            .filter(tm => tm.role === 'Photographer')
            .slice(0, pkg.requiredPhotographers || 1);
          const videog = availableCrew
            .filter(tm => tm.role === 'Videographer')
            .slice(0, pkg.requiredVideographers || 1);
          const drone = availableCrew
            .filter(tm => tm.role === 'Drone Operator')
            .slice(0, pkg.requiredDroneOperators || 0);
          crewToAssign = [...photogs, ...videog, ...drone];
        }
      }

      crewToAssign.forEach((tm, idx) => {
        const rate = tm.eventRate || tm.dailyRate || 15000;
        db.teamAssignments.push({
          id: `ta-${Date.now().toString().slice(-5)}-${idx}`,
          eventId: newEvent.id,
          teamMemberId: tm.id,
          role: tm.role,
          date: eventDate,
          hours: 8,
          rate,
          cost: rate,
          assignmentStatus: 'Assigned',
          notes: 'Auto-allocated via Calendar Booking',
        });
      });
    }

    recordAdminAudit(
      'Events & Bookings',
      ['title', 'eventDate', 'venue', 'packagePrice', 'equipmentAllocation'],
      `Created event booking "${newEvent.title}" on ${newEvent.eventDate} at ${newEvent.venue}, ${newEvent.city} (PKR ${priceNum.toLocaleString()}) with automatic resource allocation.`
    );
    dbInstance.save();
    dbInstance.recalculateEvent(newEvent.id);
    return NextResponse.json(newEvent);
  }

  if (slug[0] === 'events' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.events.findIndex(e => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    db.events[index] = { ...db.events[index], ...body, updatedDate: new Date().toISOString() };
    recordAdminAudit(
      'Events & Bookings',
      Object.keys(body),
      `Updated event "${db.events[index].title}" (${Object.keys(body).slice(0, 5).join(', ')}).`
    );
    dbInstance.save();
    const updated = dbInstance.recalculateEvent(id);
    return NextResponse.json(updated);
  }

  if (slug[0] === 'events' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const deletedEvt = db.events.find(e => e.id === id);
    db.events = db.events.filter(e => e.id !== id);
    db.daySchedules = db.daySchedules.filter(d => d.eventId !== id);
    db.teamAssignments = db.teamAssignments.filter(t => t.eventId !== id);
    db.equipmentAssignments = db.equipmentAssignments.filter(eq => eq.eventId !== id);
    db.eventExpenses = db.eventExpenses.filter(ex => ex.eventId !== id);
    db.invoices = db.invoices.filter(i => i.eventId !== id);
    db.payments = db.payments.filter(p => p.eventId !== id);
    db.quotations = db.quotations.filter(q => q.eventId !== id);
    db.tasks = db.tasks.filter(t => t.eventId !== id);
    recordAdminAudit(
      'Events & Bookings',
      ['deleted'],
      `Deleted event booking "${deletedEvt?.title || id}".`
    );
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  if (slug[0] === 'events' && slug[2] === 'recalculate' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const updated = dbInstance.recalculateEvent(id);
    if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (slug[0] === 'events' && slug[2] === 'auto-assign' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const event = db.events.find(e => e.id === id);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const pkg = db.packages.find(p => p.id === event.packageId);
    if (!pkg) return NextResponse.json({ error: 'Event does not have an associated package with crew requirements.' }, { status: 400 });

    const required = [
      { role: 'Photographer', count: pkg.requiredPhotographers },
      { role: 'Videographer', count: pkg.requiredVideographers },
      { role: 'Drone Operator', count: pkg.requiredDroneOperators },
      { role: 'Assistant', count: pkg.requiredAssistants },
    ];
    const totalRequired = required.reduce((acc, r) => acc + r.count, 0);

    const conflictingEventIds = db.events
      .filter(e => e.id !== event.id && e.eventDate === event.eventDate && e.status !== 'Cancelled')
      .map(e => e.id);

    const busyTeamMemberIds = new Set(
      db.teamAssignments
        .filter(a => conflictingEventIds.includes(a.eventId) && a.assignmentStatus !== 'Cancelled')
        .map(a => a.teamMemberId)
    );

    const alreadyAssignedMemberIds = new Set(
      db.teamAssignments
        .filter(a => a.eventId === event.id && a.assignmentStatus !== 'Cancelled')
        .map(a => a.teamMemberId)
    );

    const newAssignments: any[] = [];
    const missingRoles: string[] = [];

    for (const reqRole of required) {
      let needed = reqRole.count;
      const alreadyInRole = db.teamAssignments.filter(
        a => a.eventId === event.id && a.role === reqRole.role && a.assignmentStatus !== 'Cancelled'
      ).length;
      needed = Math.max(0, needed - alreadyInRole);

      if (needed > 0) {
        const candidates = db.teamMembers.filter(
          m =>
            m.role === reqRole.role &&
            m.isActive &&
            m.availabilityStatus !== 'On Leave' &&
            m.availabilityStatus !== 'Inactive' &&
            !busyTeamMemberIds.has(m.id) &&
            !alreadyAssignedMemberIds.has(m.id)
        );

        for (let i = 0; i < needed; i++) {
          if (i < candidates.length) {
            const selected = candidates[i];
            alreadyAssignedMemberIds.add(selected.id);
            const cost = selected.eventRate || 10000;
            const assignment = {
              id: `eta-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
              eventId: event.id,
              teamMemberId: selected.id,
              role: selected.role,
              date: event.eventDate,
              hours: 8,
              rate: cost,
              cost: cost,
              notes: `Auto-assigned based on package ${pkg.name}`,
              assignmentStatus: 'Confirmed' as any,
            };
            newAssignments.push(assignment);
          } else {
            missingRoles.push(reqRole.role);
          }
        }
      }
    }

    if (newAssignments.length > 0) {
      db.teamAssignments.push(...newAssignments);
      dbInstance.recalculateEvent(event.id);
    }

    let tempHireRecommendation = null;
    if (missingRoles.length > 0) {
      const shortageCount = missingRoles.length;
      tempHireRecommendation = {
        id: `thr-${Date.now().toString().slice(-6)}`,
        eventId: event.id,
        requiredStaff: totalRequired,
        availableStaff: totalRequired - shortageCount,
        shortageCount,
        missingRoles,
        suggestedTempMembers: missingRoles.map(role => ({
          role,
          suggestedRate: role === 'Photographer' ? 12000 : role === 'Videographer' ? 14000 : 6000,
          reason: `Shortage detected for ${event.title} on ${event.eventDate}`,
        })),
        createdAt: new Date().toISOString(),
      };
      db.tempHireRecommendations.unshift(tempHireRecommendation);
      dbInstance.save();
    }

    return NextResponse.json({
      assignedCount: newAssignments.length,
      newAssignments,
      missingRoles,
      hasShortage: missingRoles.length > 0,
      tempHireRecommendation,
    });
  }

  // ================= DAY SCHEDULES =================
  if (pathStr === 'day-schedules' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newSchedule = {
      id: `day-${Date.now().toString().slice(-6)}`,
      eventId: body.eventId,
      dayNumber: Number(body.dayNumber || 1),
      date: body.date,
      eventType: body.eventType || 'Barat',
      venue: body.venue || 'Venue',
      startTime: body.startTime || '18:00',
      endTime: body.endTime || '23:00',
      callTime: body.callTime || '16:30',
      dressCode: body.dressCode || 'Formal',
      notes: body.notes || '',
      customPrice: Number(body.customPrice || 0),
    };
    db.daySchedules.push(newSchedule);
    dbInstance.save();
    dbInstance.recalculateEvent(body.eventId);
    return NextResponse.json(newSchedule);
  }

  if (slug[0] === 'day-schedules' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.daySchedules.findIndex(d => d.id === id);
    if (index === -1) return NextResponse.json({ error: 'Day schedule not found' }, { status: 404 });
    db.daySchedules[index] = { ...db.daySchedules[index], ...body };
    dbInstance.save();
    dbInstance.recalculateEvent(db.daySchedules[index].eventId);
    return NextResponse.json(db.daySchedules[index]);
  }

  if (slug[0] === 'day-schedules' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const schedule = db.daySchedules.find(d => d.id === id);
    if (!schedule) return NextResponse.json({ error: 'Day schedule not found' }, { status: 404 });
    const eventId = schedule.eventId;
    db.daySchedules = db.daySchedules.filter(d => d.id !== id);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json({ success: true });
  }

  // ================= TEAM =================
  if (pathStr === 'team' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    if (!body.name || !body.role) {
      return NextResponse.json({ error: 'Name and Role are required' }, { status: 400 });
    }
    const newMember = {
      id: `tm-${Date.now().toString().slice(-6)}`,
      name: body.name,
      phone: body.phone || '',
      whatsapp: body.whatsapp || body.phone || '',
      email: body.email || '',
      role: body.role,
      specialization: body.specialization || '',
      dailyRate: Number(body.dailyRate || 8000),
      eventRate: Number(body.eventRate || 12000),
      availabilityStatus: (body.availabilityStatus || 'Available') as any,
      isActive: true,
      joiningDate: new Date().toISOString().split('T')[0],
      notes: body.notes || '',
    };
    db.teamMembers.push(newMember);
    dbInstance.save();
    return NextResponse.json(newMember);
  }

  if (slug[0] === 'team' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.teamMembers.findIndex(m => m.id === id);
    if (index === -1) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    db.teamMembers[index] = { ...db.teamMembers[index], ...body };
    dbInstance.save();
    return NextResponse.json(db.teamMembers[index]);
  }

  if (slug[0] === 'team' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    db.teamMembers = db.teamMembers.filter(m => m.id !== id);
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= TEAM ASSIGNMENTS =================
  if (pathStr === 'team-assignments' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { eventId, teamMemberId, role, date, hours, rate, cost, notes, assignmentStatus } = body;

    const conflicting = db.teamAssignments.find(a => {
      if (a.teamMemberId !== teamMemberId) return false;
      if (a.assignmentStatus === 'Cancelled') return false;
      if (a.eventId === eventId) return false;
      const otherEvent = db.events.find(e => e.id === a.eventId);
      return otherEvent && otherEvent.eventDate === date && otherEvent.status !== 'Cancelled';
    });

    if (conflicting) {
      const conflictEvent = db.events.find(e => e.id === conflicting.eventId);
      return NextResponse.json(
        { error: `Conflict detected! This team member is already assigned to "${conflictEvent?.title || 'Another Event'}" on ${date}.` },
        { status: 400 }
      );
    }

    const newAssignment = {
      id: `eta-${Date.now().toString().slice(-6)}`,
      eventId,
      teamMemberId,
      role,
      date,
      hours: Number(hours || 8),
      rate: Number(rate || 0),
      cost: Number(cost || rate || 0),
      notes: notes || '',
      assignmentStatus: (assignmentStatus || 'Confirmed') as any,
    };
    db.teamAssignments.push(newAssignment);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json(newAssignment);
  }

  if (slug[0] === 'team-assignments' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.teamAssignments.findIndex(a => a.id === id);
    if (index === -1) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    db.teamAssignments[index] = { ...db.teamAssignments[index], ...body };
    dbInstance.save();
    dbInstance.recalculateEvent(db.teamAssignments[index].eventId);
    return NextResponse.json(db.teamAssignments[index]);
  }

  if (slug[0] === 'team-assignments' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const assignment = db.teamAssignments.find(a => a.id === id);
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    const eventId = assignment.eventId;
    db.teamAssignments = db.teamAssignments.filter(a => a.id !== id);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json({ success: true });
  }

  // ================= EQUIPMENT =================
  if (pathStr === 'equipment' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }
    const newEquip = {
      id: `eq-${Date.now().toString().slice(-6)}`,
      name: body.name,
      category: body.category,
      brand: body.brand || 'Sony',
      model: body.model || '',
      serialNumber: body.serialNumber || `SN-${Date.now().toString().slice(-4)}`,
      quantity: Number(body.quantity || 1),
      status: 'Available' as any,
      rentalRate: Number(body.rentalRate || 4000),
      purchaseDate: new Date().toISOString().split('T')[0],
      serviceAfterUses: Number(body.serviceAfterUses || 20),
      currentUsageCount: 0,
      notes: body.notes || '',
    };
    db.equipment.push(newEquip);
    dbInstance.save();
    return NextResponse.json(newEquip);
  }

  if (slug[0] === 'equipment' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.equipment.findIndex(e => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    db.equipment[index] = { ...db.equipment[index], ...body };
    dbInstance.save();
    return NextResponse.json(db.equipment[index]);
  }

  if (slug[0] === 'equipment' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    db.equipment = db.equipment.filter(e => e.id !== id);
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= EQUIPMENT ASSIGNMENTS =================
  if (pathStr === 'equipment-assignments' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { eventId, equipmentId, quantity, rentalRate, notes } = body;
    const equip = db.equipment.find(e => e.id === equipmentId);
    const event = db.events.find(e => e.id === eventId);
    if (!equip || !event) {
      return NextResponse.json({ error: 'Equipment or Event not found' }, { status: 404 });
    }
    if (equip.status === 'Damaged' || equip.status === 'Maintenance') {
      return NextResponse.json(
        { error: `Equipment "${equip.name}" is marked as ${equip.status} and cannot be assigned.` },
        { status: 400 }
      );
    }
    const conflictingEvents = db.events.filter(e => e.id !== event.id && e.eventDate === event.eventDate && e.status !== 'Cancelled');
    const conflictingEventIds = conflictingEvents.map(e => e.id);
    const requestedQty = Number(quantity || 1);
    const alreadyBookedQty = db.equipmentAssignments
      .filter(a => conflictingEventIds.includes(a.eventId) && a.equipmentId === equipmentId)
      .reduce((sum, a) => sum + a.quantity, 0);
    const availableQty = equip.quantity - alreadyBookedQty;

    if (requestedQty > availableQty) {
      return NextResponse.json(
        { error: `Equipment unavailable: "${equip.name}" has ${availableQty} available on this date, requested ${requestedQty}.` },
        { status: 400 }
      );
    }

    const rate = Number(rentalRate || equip.rentalRate || 0);
    const newAssignment = {
      id: `eea-${Date.now().toString().slice(-6)}`,
      eventId,
      equipmentId,
      quantity: requestedQty,
      rentalRate: rate,
      rentalCost: requestedQty * rate,
      isCheckedOut: false,
      isCheckedIn: false,
      notes: notes || '',
    };
    equip.currentUsageCount = (equip.currentUsageCount || 0) + 1;
    db.equipmentAssignments.push(newAssignment);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json(newAssignment);
  }

  if (slug[0] === 'equipment-assignments' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.equipmentAssignments.findIndex(a => a.id === id);
    if (index === -1) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    db.equipmentAssignments[index] = { ...db.equipmentAssignments[index], ...body };
    dbInstance.save();
    dbInstance.recalculateEvent(db.equipmentAssignments[index].eventId);
    return NextResponse.json(db.equipmentAssignments[index]);
  }

  if (slug[0] === 'equipment-assignments' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const assignment = db.equipmentAssignments.find(a => a.id === id);
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    const eventId = assignment.eventId;
    db.equipmentAssignments = db.equipmentAssignments.filter(a => a.id !== id);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json({ success: true });
  }

  // ================= MAINTENANCE LOGS =================
  if (pathStr === 'maintenance-logs' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newLog = {
      id: `mnt-${Date.now().toString().slice(-6)}`,
      equipmentId: body.equipmentId,
      date: new Date().toISOString().split('T')[0],
      issue: body.issue || 'Maintenance Report',
      description: body.description || '',
      reportedBy: user?.name || 'Administrator',
      cost: Number(body.cost || 0),
      status: (body.status || 'Pending') as any,
      repairNotes: body.repairNotes || '',
    };
    const equip = db.equipment.find(e => e.id === body.equipmentId);
    if (equip && (body.status === 'In Repair' || body.status === 'Pending')) {
      equip.status = 'Maintenance';
    }
    db.maintenanceLogs.unshift(newLog);
    dbInstance.save();
    return NextResponse.json(newLog);
  }

  // ================= PACKAGES =================
  if (pathStr === 'packages' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newPkg = {
      id: `pkg-${Date.now().toString().slice(-6)}`,
      name: body.name,
      category: body.category || 'Wedding',
      description: body.description || '',
      price: Number(body.price || 0),
      duration: body.duration || 'Full Day',
      requiredPhotographers: Number(body.requiredPhotographers || 1),
      requiredVideographers: Number(body.requiredVideographers || 1),
      requiredDroneOperators: Number(body.requiredDroneOperators || 0),
      requiredAssistants: Number(body.requiredAssistants || 0),
      includedServices: Array.isArray(body.includedServices) ? body.includedServices : [],
      deliverables: Array.isArray(body.deliverables) ? body.deliverables : [],
      isActive: true,
    };
    db.packages.push(newPkg);
    recordAdminAudit(
      'Packages',
      ['name', 'price', 'category', 'duration'],
      `Created package "${newPkg.name}" (${newPkg.category}) priced at PKR ${newPkg.price.toLocaleString()}.`
    );
    dbInstance.save();
    return NextResponse.json(newPkg);
  }

  if (slug[0] === 'packages' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.packages.findIndex(p => p.id === id);
    if (index === -1) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    db.packages[index] = { ...db.packages[index], ...body };
    recordAdminAudit(
      'Packages',
      Object.keys(body),
      `Edited package "${db.packages[index].name}" — updated ${Object.keys(body).join(', ')} (PKR ${Number(db.packages[index].price || 0).toLocaleString()}).`
    );
    dbInstance.save();
    return NextResponse.json(db.packages[index]);
  }

  if (slug[0] === 'packages' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const deletedPkg = db.packages.find(p => p.id === id);
    db.packages = db.packages.filter(p => p.id !== id);
    recordAdminAudit(
      'Packages',
      ['deleted'],
      `Deleted package "${deletedPkg?.name || id}".`
    );
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= EVENT EXPENSES =================
  if (pathStr === 'expenses' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newExp = {
      id: `exp-${Date.now().toString().slice(-6)}`,
      eventId: body.eventId,
      category: body.category || 'Miscellaneous',
      description: body.description || '',
      amount: Number(body.amount || 0),
      date: body.date || new Date().toISOString().split('T')[0],
      paidBy: user?.name || 'Royal Studio',
      notes: body.notes || '',
    };
    db.eventExpenses.push(newExp);
    recordAdminAudit(
      'Event Expenses',
      ['category', 'amount', 'description'],
      `Added event expense "${newExp.description || newExp.category}" of PKR ${newExp.amount.toLocaleString()}.`
    );
    dbInstance.save();
    dbInstance.recalculateEvent(body.eventId);
    return NextResponse.json(newExp);
  }

  if (slug[0] === 'expenses' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.eventExpenses.findIndex(e => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    db.eventExpenses[index] = { ...db.eventExpenses[index], ...body };
    recordAdminAudit(
      'Event Expenses',
      Object.keys(body),
      `Updated event expense "${db.eventExpenses[index].description || db.eventExpenses[index].category}" (PKR ${Number(db.eventExpenses[index].amount || 0).toLocaleString()}).`
    );
    dbInstance.save();
    dbInstance.recalculateEvent(db.eventExpenses[index].eventId);
    return NextResponse.json(db.eventExpenses[index]);
  }

  if (slug[0] === 'expenses' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const expense = db.eventExpenses.find(e => e.id === id);
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const eventId = expense.eventId;
    db.eventExpenses = db.eventExpenses.filter(e => e.id !== id);
    recordAdminAudit(
      'Event Expenses',
      ['deleted'],
      `Deleted event expense "${expense.description || expense.category}" (PKR ${expense.amount.toLocaleString()}).`
    );
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json({ success: true });
  }

  // ================= STUDIO EXPENSES =================
  if (pathStr === 'studio-expenses' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newStudioExp = {
      id: `sexp-${Date.now().toString().slice(-6)}`,
      category: body.category || 'Other',
      description: body.description || '',
      amount: Number(body.amount || 0),
      date: body.date || new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod || 'Bank Transfer',
      recurring: !!body.recurring,
      notes: body.notes || '',
      createdBy: user?.id || 'usr-admin',
    };
    db.studioExpenses.unshift(newStudioExp);
    recordAdminAudit(
      'Studio Expenses',
      ['category', 'description', 'amount', 'paymentMethod'],
      `Recorded studio overhead expense "${newStudioExp.description || newStudioExp.category}" of PKR ${newStudioExp.amount.toLocaleString()} (${newStudioExp.category}).`
    );
    dbInstance.save();
    return NextResponse.json(newStudioExp);
  }

  if (slug[0] === 'studio-expenses' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.studioExpenses.findIndex(e => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Studio expense not found' }, { status: 404 });
    db.studioExpenses[index] = { ...db.studioExpenses[index], ...body };
    recordAdminAudit(
      'Studio Expenses',
      Object.keys(body),
      `Updated studio overhead expense "${db.studioExpenses[index].description || db.studioExpenses[index].category}" (PKR ${Number(db.studioExpenses[index].amount || 0).toLocaleString()}).`
    );
    dbInstance.save();
    return NextResponse.json(db.studioExpenses[index]);
  }

  if (slug[0] === 'studio-expenses' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const deletedStudioExp = db.studioExpenses.find(e => e.id === id);
    db.studioExpenses = db.studioExpenses.filter(e => e.id !== id);
    recordAdminAudit(
      'Studio Expenses',
      ['deleted'],
      `Deleted studio overhead expense "${deletedStudioExp?.description || id}" (PKR ${Number(deletedStudioExp?.amount || 0).toLocaleString()}).`
    );
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= INVOICES =================
  if (pathStr === 'invoices' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { clientId, eventId, dueDate, subtotal, discount, tax, paymentTerms, notes } = body;
    const sub = Number(subtotal || 0);
    const disc = Number(discount || 0);
    const tx = Number(tax || 0);
    const tot = sub - disc + tx;

    const eventPayments = db.payments.filter(p => p.eventId === eventId);
    const paid = eventPayments.reduce((sum, p) => sum + p.amount, 0);
    const invNum = `${db.profile.invoicePrefix}${String(db.invoices.length + 1001).padStart(4, '0')}`;

    const newInvoice = {
      id: `inv-${Date.now().toString().slice(-6)}`,
      invoiceNumber: invNum,
      clientId,
      eventId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: sub,
      discount: disc,
      tax: tx,
      total: tot,
      paidAmount: paid,
      remainingAmount: Math.max(0, tot - paid),
      paymentTerms: paymentTerms || db.profile.paymentTerms,
      notes: notes || '',
      status: computeInvoiceStatus({ dueDate, total: tot }, paid),
      createdBy: user?.id || 'usr-admin',
    };
    db.invoices.unshift(newInvoice);
    dbInstance.save();
    return NextResponse.json(newInvoice);
  }

  if (slug[0] === 'invoices' && slug.length === 2 && method === 'PUT') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.invoices.findIndex(i => i.id === id);
    if (index === -1) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const existing = db.invoices[index];
    const updated = { ...existing, ...body };
    updated.total = updated.subtotal - updated.discount + updated.tax;
    updated.remainingAmount = Math.max(0, updated.total - updated.paidAmount);
    updated.status = computeInvoiceStatus(updated, updated.paidAmount);
    db.invoices[index] = updated;
    dbInstance.save();
    return NextResponse.json(updated);
  }

  if (slug[0] === 'invoices' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    db.invoices = db.invoices.filter(i => i.id !== id);
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= PAYMENTS =================
  if (pathStr === 'payments' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { eventId, invoiceId, amount, paymentDate, method: payMethod, reference, notes } = body;
    const amt = Number(amount || 0);
    if (amt <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
    }
    const event = db.events.find(e => e.id === eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const newPayment = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      paymentId: `PAY-${Date.now().toString().slice(-4)}`,
      eventId,
      invoiceId,
      amount: amt,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      method: payMethod || 'Bank Transfer',
      reference: reference || '',
      notes: notes || '',
      createdBy: user?.id || 'usr-admin',
    };
    db.payments.unshift(newPayment);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json(newPayment);
  }

  if (slug[0] === 'payments' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    const payment = db.payments.find(p => p.id === id);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    const eventId = payment.eventId;
    db.payments = db.payments.filter(p => p.id !== id);
    dbInstance.save();
    dbInstance.recalculateEvent(eventId);
    return NextResponse.json({ success: true });
  }

  // ================= QUOTATIONS =================
  if (pathStr === 'quotations' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { clientId, eventId, validUntil, subtotal, discount, tax, paymentTerms, notes } = body;
    const sub = Number(subtotal || 0);
    const disc = Number(discount || 0);
    const tx = Number(tax || 0);
    const quoNumber = `${db.profile.quotationPrefix}${String(db.quotations.length + 1001).padStart(4, '0')}`;
    const newQuo = {
      id: `quo-${Date.now().toString().slice(-6)}`,
      quotationNumber: quoNumber,
      clientId,
      eventId,
      issueDate: new Date().toISOString().split('T')[0],
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: sub,
      discount: disc,
      tax: tx,
      total: sub - disc + tx,
      paymentTerms: paymentTerms || db.profile.paymentTerms,
      notes: notes || '',
      createdBy: user?.id || 'usr-admin',
    };
    db.quotations.unshift(newQuo);
    dbInstance.save();
    return NextResponse.json(newQuo);
  }

  // ================= TASKS =================
  if (pathStr === 'tasks' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    if (!body.title || !body.eventId) {
      return NextResponse.json({ error: 'Title and Event are required.' }, { status: 400 });
    }
    const newTask = {
      id: `tsk-${Date.now().toString().slice(-6)}`,
      eventId: body.eventId,
      title: body.title,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate || new Date().toISOString().split('T')[0],
      priority: (body.priority || 'Normal') as any,
      status: 'Pending' as any,
      description: body.description || '',
      createdDate: new Date().toISOString().split('T')[0],
    };
    db.tasks.unshift(newTask);
    dbInstance.save();
    return NextResponse.json(newTask);
  }

  if (slug[0] === 'tasks' && slug.length === 2 && method === 'PUT') {
    const err = requireAuthCheck();
    if (err) return err;
    const id = slug[1];
    const body = await parseJsonBody(req);
    const index = db.tasks.findIndex(t => t.id === id);
    if (index === -1) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    const existingTask = db.tasks[index];

    if (user?.role === 'STAFF') {
      const isAssigned = user.linkedTeamMemberId && existingTask.assigneeId === user.linkedTeamMemberId;
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden. You can only update tasks assigned to you.' }, { status: 403 });
      }
      if (body.status) {
        existingTask.status = body.status;
        if (body.status === 'Completed' && !existingTask.completedDate) {
          existingTask.completedDate = new Date().toISOString().split('T')[0];
        }
      }
      db.tasks[index] = existingTask;
      dbInstance.save();
      return NextResponse.json(existingTask);
    }

    const updated = { ...db.tasks[index], ...body };
    if (updated.status === 'Completed' && !updated.completedDate) {
      updated.completedDate = new Date().toISOString().split('T')[0];
    }
    db.tasks[index] = updated;
    dbInstance.save();
    return NextResponse.json(updated);
  }

  if (slug[0] === 'tasks' && slug.length === 2 && method === 'DELETE') {
    const err = requireAdminCheck();
    if (err) return err;
    const id = slug[1];
    db.tasks = db.tasks.filter(t => t.id !== id);
    dbInstance.save();
    return NextResponse.json({ success: true });
  }

  // ================= TEAM PAYMENTS & BATCH PAYOUT =================
  if (pathStr === 'team-payments' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const newPayment = {
      id: `tp-${Date.now().toString().slice(-6)}`,
      teamMemberId: body.teamMemberId,
      eventId: body.eventId,
      paymentType: body.paymentType || 'Event Payment',
      amount: Number(body.amount || 0),
      date: body.date || new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod || 'Bank Transfer',
      reference: body.reference || '',
      notes: body.notes || '',
      createdBy: user?.id || 'usr-admin',
    };
    db.teamPayments.unshift(newPayment);
    dbInstance.save();
    return NextResponse.json(newPayment);
  }

  if (pathStr === 'payout-batch' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;
    const body = await parseJsonBody(req);
    const { payouts } = body;
    if (!Array.isArray(payouts) || payouts.length === 0) {
      return NextResponse.json({ error: 'No payout items provided' }, { status: 400 });
    }
    const createdRecords: any[] = [];
    const batchId = `BATCH-${Date.now().toString().slice(-4)}`;
    for (const item of payouts) {
      const rec = {
        id: `tp-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
        teamMemberId: item.teamMemberId,
        paymentType: item.paymentType || 'Salary',
        amount: Number(item.amount || 0),
        date: new Date().toISOString().split('T')[0],
        paymentMethod: item.paymentMethod || 'Bank Transfer',
        reference: batchId,
        notes: item.notes || `Processed in Batch ${batchId}`,
        createdBy: user?.id || 'usr-admin',
      };
      db.teamPayments.unshift(rec);
      createdRecords.push(rec);
    }
    dbInstance.save();
    return NextResponse.json({ success: true, batchId, totalProcessed: createdRecords.length, records: createdRecords });
  }

  // ================= AI BRIEFING (GEMINI 3.8 FLASH) =================
  if (pathStr === 'ai/briefing' && method === 'POST') {
    const err = requireAdminCheck();
    if (err) return err;

    const activeEvents = db.events.filter(e => e.status !== 'Cancelled');
    const totalRevenue = activeEvents.reduce((sum, e) => sum + (e.totalClientPayments || 0), 0);
    const totalProfit = activeEvents.reduce((sum, e) => sum + (e.netProfit || 0), 0);
    const overdueInvoices = db.invoices.filter(i => i.status === 'Overdue');
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.remainingAmount, 0);
    const urgentTasks = db.tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed');
    const availableTeam = db.teamMembers.filter(m => m.availabilityStatus === 'Available' && m.isActive).length;
    const lossLeaders = activeEvents.filter(e => (e.netProfit || 0) < 0);
    const equipServiceWarnings = db.equipment.filter(eq => (eq.currentUsageCount || 0) >= (eq.serviceAfterUses || 20)).length;

    const dataSummary = {
      totalActiveEvents: activeEvents.length,
      totalRevenuePKR: totalRevenue,
      totalProfitPKR: totalProfit,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesAmountPKR: overdueAmount,
      urgentTasksCount: urgentTasks.length,
      availableTeamCount: availableTeam,
      lossLeadersCount: lossLeaders.length,
      equipmentServiceWarningsCount: equipServiceWarnings,
      eventsList: activeEvents.slice(0, 5).map(e => ({
        title: e.title,
        category: e.category,
        date: e.eventDate,
        price: e.packagePrice,
        netProfit: e.netProfit,
      })),
    };

    const systemPrompt = `You are the executive AI business intelligence engine for ROYAL STUDIO, a luxury photography and cinematic filmmaking studio in Pakistan.
You must analyze the provided real-time studio financial and operational data and return a JSON object with EXACTLY these five fields:
1. "highlight": One positive business observation based on the live data.
2. "urgentAction": The single most critical operational issue requiring immediate executive attention.
3. "riskAlert": A specific financial or operational risk grounded in the data (e.g. overdue invoices, negative margin events, or maintenance).
4. "opportunity": A practical business growth or upsell recommendation.
5. "todaysTip": A practical studio management tip for wedding/commercial photography operations in Pakistan.
Rules:
- DO NOT invent facts; ground all numbers strictly in the provided data.
- Mention PKR currency values where relevant.
- Return ONLY valid JSON with keys: highlight, urgentAction, riskAlert, opportunity, todaysTip.`;

    const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const isValidGeminiKey =
      rawApiKey.length > 20 &&
      rawApiKey.startsWith('AIza') &&
      !rawApiKey.includes('YOUR_') &&
      !rawApiKey.includes('MY_');

    if (isValidGeminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: rawApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Here is the current live data from Royal Studio database:\n${JSON.stringify(dataSummary, null, 2)}`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });
        const text = response.text || '';
        const parsed = JSON.parse(text);
        if (parsed && parsed.highlight && parsed.urgentAction) {
          return NextResponse.json({ ...parsed, generatedAt: new Date().toISOString() });
        }
      } catch {
        // Gracefully fall back to deterministic real-time studio analytics below
      }
    }

    const fallback = {
      highlight: `Solid revenue pipeline of PKR ${totalRevenue.toLocaleString()} with PKR ${totalProfit.toLocaleString()} net profit across ${activeEvents.length} active studio productions.`,
      urgentAction:
        overdueInvoices.length > 0
          ? `Recover PKR ${overdueAmount.toLocaleString()} across ${overdueInvoices.length} overdue invoices immediately to preserve cash flow.`
          : urgentTasks.length > 0
          ? `Clear ${urgentTasks.length} urgent post-production tasks (${urgentTasks[0]?.title || 'pending reels'}) before delivery deadlines.`
          : `Complete pre-production crew call-sheets for upcoming wedding schedules.`,
      riskAlert:
        lossLeaders.length > 0
          ? `Notice: ${lossLeaders.length} production(s) like "${lossLeaders[0]?.title}" operated at negative margin due to high gear and travel overheads.`
          : equipServiceWarnings > 0
          ? `Sensor calibration & service overdue on ${equipServiceWarnings} flagship camera bodies.`
          : `Monitor equipment checkout schedules to avoid gear shortages during multi-day coverage.`,
      opportunity: `Package multi-day wedding clients with luxury Italian flushmount album upgrades and drone 4K aerial reels at a 25% margin.`,
      todaysTip: `Ensure double SD-card redundancy and battery recharge checklists are verified before departure for Barat and Walima banquet shoots.`,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(fallback);
  }

  return NextResponse.json({ error: `Route not found: ${method} /api/${pathStr}` }, { status: 404 });
}
