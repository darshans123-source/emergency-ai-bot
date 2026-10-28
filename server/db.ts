import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Incident,
  Resource,
  ResourceAssignment,
  AgentRun,
  AgentEvent,
  IncidentNote,
  Notification,
  AuditLog,
  DashboardSummary,
  EmergencyFacility
} from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'emergency_db.json');

export interface DatabaseSchema {
  users: User[];
  incidents: Incident[];
  resources: Resource[];
  assignments: ResourceAssignment[];
  agentRuns: AgentRun[];
  agentEvents: AgentEvent[];
  incidentNotes: IncidentNote[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  facilities?: EmergencyFacility[];
}

export function hashPassword(password: string): string {
  const salt = 'emrg_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

export const INITIAL_FACILITIES: EmergencyFacility[] = [
  {
    id: 'FAC-POL-01',
    name: 'Metro Central Police Headquarters',
    type: 'POLICE_STATION',
    address: '850 Bryant St, San Francisco, CA',
    latitude: 37.7755,
    longitude: -122.4040,
    contactPhone: '(415) 553-0123',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'POLICE_TACTICAL',
    details: '24/7 Tactical dispatch headquarters, perimeter security control, and incident command post.',
    verified: true
  },
  {
    id: 'FAC-POL-02',
    name: 'Downtown Police Precinct Sector 1',
    type: 'POLICE_STATION',
    address: '766 Vallejo St, San Francisco, CA',
    latitude: 37.7980,
    longitude: -122.4098,
    contactPhone: '(415) 553-1563',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'POLICE_TACTICAL',
    details: 'High-density urban safety watch, traffic rerouting division, and public order operations.',
    verified: true
  },
  {
    id: 'FAC-POL-03',
    name: 'Southern Waterfront Patrol Post',
    type: 'POLICE_STATION',
    address: '1251 3rd St, San Francisco, CA',
    latitude: 37.7725,
    longitude: -122.3890,
    contactPhone: '(415) 671-2300',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'POLICE_TACTICAL',
    details: 'Bay corridor security, transit cordon support, and harbor tactical staging.',
    verified: true
  },
  {
    id: 'FAC-HOS-01',
    name: 'Metro General Hospital & Trauma Center',
    type: 'HOSPITAL',
    address: '1001 Potrero Ave, San Francisco, CA',
    latitude: 37.7560,
    longitude: -122.4060,
    contactPhone: '(415) 206-8000',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'HOSPITAL_EMS',
    details: 'Level 1 Comprehensive Trauma Center with helipad, burn critical unit, and 450 bed capacity.',
    verified: true
  },
  {
    id: 'FAC-HOS-02',
    name: 'St. Jude Emergency Medical Center',
    type: 'HOSPITAL',
    address: '900 Hyde St, San Francisco, CA',
    latitude: 37.7895,
    longitude: -122.4170,
    contactPhone: '(415) 353-6000',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'HOSPITAL_EMS',
    details: 'Cardiac & Stroke Emergency Receiving Center, 24/7 Pediatric Emergency Resuscitation Unit.',
    verified: true
  },
  {
    id: 'FAC-HOS-03',
    name: 'Westside Urgent Care & Surgical Bay',
    type: 'HOSPITAL',
    address: '1600 Divisadero St, San Francisco, CA',
    latitude: 37.7850,
    longitude: -122.4395,
    contactPhone: '(415) 567-6600',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'HOSPITAL_EMS',
    details: 'Rapid triage clinic, acute stabilization beds, and mobile medical dispatch support.',
    verified: true
  },
  {
    id: 'FAC-WAT-01',
    name: 'Central Municipal Water Treatment Plant',
    type: 'WATER_FACILITY',
    address: '525 Golden Gate Ave, San Francisco, CA',
    latitude: 37.7810,
    longitude: -122.4190,
    contactPhone: '(415) 554-3155',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'WATER_HYDRO',
    details: 'Main reservoir intake, 120 MGD filtration facility, high-pressure emergency fire mains monitoring.',
    verified: true
  },
  {
    id: 'FAC-WAT-02',
    name: 'North Basin Hydro Pumping & Surge Station',
    type: 'WATER_FACILITY',
    address: '2090 Marina Blvd, San Francisco, CA',
    latitude: 37.8040,
    longitude: -122.4360,
    contactPhone: '(415) 554-3200',
    operationalStatus: 'OPERATIONAL',
    agentDomain: 'WATER_HYDRO',
    details: 'High-volume urban flood runoff diversion station and emergency auxiliary water supply pumps.',
    verified: true
  },
  {
    id: 'FAC-WAT-03',
    name: 'East District Water Storage & Main Gate',
    type: 'WATER_FACILITY',
    address: '1300 Evans Ave, San Francisco, CA',
    latitude: 37.7470,
    longitude: -122.3850,
    contactPhone: '(415) 554-3320',
    operationalStatus: 'STANDBY',
    agentDomain: 'WATER_HYDRO',
    details: '15-million gallon underground reservoir and automated pressure telemetry station.',
    verified: true
  },
  {
    id: 'FAC-PWR-01',
    name: 'KEB / Metro Grid Primary 230kV Substation',
    type: 'POWER_SUBSTATION',
    address: '450 8th St, San Francisco, CA',
    latitude: 37.7740,
    longitude: -122.4080,
    contactPhone: '(415) 558-4500',
    agentDomain: 'CURRENT_KEB',
    operationalStatus: 'OPERATIONAL',
    details: 'High-voltage bulk transmission step-down substation with automated SCADA isolation switches.',
    verified: true
  },
  {
    id: 'FAC-PWR-02',
    name: 'Downtown Electrical Distribution Substation',
    type: 'POWER_SUBSTATION',
    address: '222 Jessie St, San Francisco, CA',
    latitude: 37.7875,
    longitude: -122.4030,
    contactPhone: '(415) 558-4520',
    agentDomain: 'CURRENT_KEB',
    operationalStatus: 'OPERATIONAL',
    details: 'Underground grid network transformers serving financial core with automatic fault isolation.',
    verified: true
  },
  {
    id: 'FAC-PWR-03',
    name: 'Potrero Grid Switching & BESS Substation',
    type: 'POWER_SUBSTATION',
    address: '1201 Illinois St, San Francisco, CA',
    latitude: 37.7590,
    longitude: -122.3865,
    contactPhone: '(415) 558-4540',
    agentDomain: 'CURRENT_KEB',
    operationalStatus: 'OPERATIONAL',
    details: '50MW Battery Energy Storage System (BESS) and black-start contingency grid interconnect.',
    verified: true
  }
];

export function createInitialSeed(): DatabaseSchema {
  const now = new Date().toISOString();
  const pastMinutes = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

  const users: User[] = [
    {
      id: 'USR-ADMIN-01',
      name: 'Dr. Evelyn Carter',
      email: 'admin@emergency.gov',
      passwordHash: hashPassword('AdminPass2026!'),
      role: 'admin',
      organization: 'Metro Emergency Command HQ',
      createdAt: pastMinutes(1000)
    },
    {
      id: 'USR-OPERATOR-01',
      name: 'Marcus Vance',
      email: 'operator@emergency.gov',
      passwordHash: hashPassword('OperatorPass2026!'),
      role: 'operator',
      organization: 'Central Incident Dispatch Hub',
      createdAt: pastMinutes(900)
    },
    {
      id: 'USR-OPERATOR-02',
      name: 'Sarah Lin',
      email: 'sarah.lin@emergency.gov',
      passwordHash: hashPassword('OperatorPass2026!'),
      role: 'operator',
      organization: 'Regional Fire & Rescue Coordination',
      createdAt: pastMinutes(850)
    },
    {
      id: 'USR-REPORTER-01',
      name: 'Citizen Jane Doe',
      email: 'citizen@metro.org',
      passwordHash: hashPassword('ReporterPass2026!'),
      role: 'reporter',
      organization: 'Public Safety Reporter',
      createdAt: pastMinutes(800)
    }
  ];

  const resources: Resource[] = [
    {
      id: 'RES-AMB-01',
      name: 'Medic Unit 1 (ALS Advanced Life Support)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Metro General Hospital Station, Medical Blvd',
      capacity: '2 Paramedics, 1 Critical Bed',
      operationalNotes: 'Equipped with defibrillator, ventilator, emergency narcotics',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-AMB-02',
      name: 'Medic Unit 4 (Rapid Response BLS)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      latitude: 37.7812,
      longitude: -122.4215,
      address: 'Westside Transit Hub Medical Bay',
      capacity: '2 EMTs, 1 Transport Stretcher',
      operationalNotes: 'Rapid triage ready; oxygen support',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-FIRE-01',
      name: 'Engine Company 3 (Pumper / 1500 GPM)',
      type: 'FIRE_UNIT',
      status: 'AVAILABLE',
      latitude: 37.7785,
      longitude: -122.4115,
      address: 'Fire Station #1, Mission & 7th',
      capacity: '4 Firefighters, 750 Gal Tank',
      operationalNotes: 'Foam suppression capable, hydraulic jaws on board',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-FIRE-02',
      name: 'Ladder Truck 1 (Heavy Extrication)',
      type: 'FIRE_UNIT',
      status: 'AVAILABLE',
      latitude: 37.7650,
      longitude: -122.3910,
      address: 'East Industrial Fire Depot, 3rd & 16th',
      capacity: '5 Firefighters, 100ft Aerial Ladder',
      operationalNotes: 'High-angle rescue and heavy structural breaching gear',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-POL-01',
      name: 'Patrol Unit 102 (Tactical Perimeter & Traffic)',
      type: 'POLICE_PATROL',
      status: 'AVAILABLE',
      latitude: 37.7755,
      longitude: -122.4040,
      address: 'South Police Precinct, Bryant & 6th',
      capacity: '2 Officers, Scene Barricades',
      operationalNotes: 'Traffic management, perimeter lockdown, emergency escort',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-POL-02',
      name: 'Patrol Unit 105 (Downtown Sector Squad)',
      type: 'POLICE_PATROL',
      status: 'AVAILABLE',
      latitude: 37.7858,
      longitude: -122.4065,
      address: 'Downtown Sector Post, Market & 4th',
      capacity: '2 Officers',
      operationalNotes: 'Active downtown patrol, pedestrian crowd containment',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-RSC-01',
      name: 'Metro Technical Search & Rescue Alpha',
      type: 'RESCUE_TEAM',
      status: 'AVAILABLE',
      latitude: 37.7795,
      longitude: -122.4180,
      address: 'Civic Center Command Plaza Depot',
      capacity: '6 Specialists, Trench & Structural Rigging',
      operationalNotes: 'Canine search team, acoustic listening equipment',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    },
    {
      id: 'RES-SUP-01',
      name: 'Mobile HazMat & Decontamination Support',
      type: 'GENERAL_SUPPORT',
      status: 'AVAILABLE',
      latitude: 37.7690,
      longitude: -122.4075,
      address: 'Highway 101 Emergency Logistics Depot',
      capacity: '3 HazMat Technicians, Neutralization Units',
      operationalNotes: 'Spill containment barriers, chemical air monitoring',
      assignedIncidentId: null,
      isDemo: true,
      lastVerifiedAt: now
    }
  ];

  const incidents: Incident[] = [];
  const assignments: ResourceAssignment[] = [];
  const agentRuns: AgentRun[] = [];
  const agentEvents: AgentEvent[] = [];
  const incidentNotes: IncidentNote[] = [];
  const notifications: Notification[] = [];
  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-001',
      userId: 'USR-ADMIN-01',
      userEmail: 'admin@emergency.gov',
      userRole: 'admin',
      action: 'SYSTEM_STARTUP',
      entityType: 'SYSTEM',
      entityId: 'ROOT',
      details: 'AegisAI Grid command center initialized. Emergency response fleet ready.',
      createdAt: now
    }
  ];

  return {
    users,
    incidents,
    resources,
    assignments,
    agentRuns,
    agentEvents,
    incidentNotes,
    notifications,
    auditLogs,
    facilities: [...INITIAL_FACILITIES]
  };
}

class DatabaseService {
  private db: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.ensureDataDir();
    this.db = this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.facilities || parsed.facilities.length === 0) {
          parsed.facilities = [...INITIAL_FACILITIES];
        }
        return parsed;
      }
    } catch (err) {
      console.error('[DB] Failed reading db file, regenerating seed data:', err);
    }
    const seed = createInitialSeed();
    this.saveDirect(seed);
    return seed;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed writing db file:', err);
    }
  }

  public persist() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.saveDirect(this.db);
    } finally {
      this.isSaving = false;
    }
  }

  public resetDemoData(): void {
    this.db = createInitialSeed();
    this.persist();
  }

  // --- Users ---
  public getUsers(): User[] {
    return [...this.db.users];
  }

  public getUserByEmail(email: string): User | undefined {
    return this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `USR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      createdAt: new Date().toISOString()
    };
    this.db.users.push(newUser);
    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.db.users[idx] = { ...this.db.users[idx], ...updates };
    this.persist();
    return this.db.users[idx];
  }

  // --- Incidents ---
  public getIncidents(filters?: {
    category?: string;
    priority?: string;
    status?: string;
    search?: string;
    reporterId?: string;
  }): Incident[] {
    let list = [...this.db.incidents];

    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter(i => i.category === filters.category);
    }
    if (filters?.priority && filters.priority !== 'ALL') {
      list = list.filter(i => i.priority === filters.priority);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters?.reporterId) {
      list = list.filter(i => i.reporterId === filters.reporterId);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.address.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.db.incidents.find(i => i.id === id);
  }

  public createIncident(incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Incident {
    const nextSeq = this.db.incidents.length + 1;
    const year = new Date().getFullYear();
    const id = `INC-${year}-${String(nextSeq).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      ...incidentData,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.db.incidents.unshift(incident);
    this.persist();
    return incident;
  }

  public updateIncident(id: string, updates: Partial<Incident>): Incident | null {
    const index = this.db.incidents.findIndex(i => i.id === id);
    if (index === -1) return null;

    const current = this.db.incidents[index];
    const updated: Incident = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.db.incidents[index] = updated;
    this.persist();
    return updated;
  }

  // --- Resources ---
  public getResources(type?: string, status?: string): Resource[] {
    let list = [...this.db.resources];
    if (type && type !== 'ALL') {
      list = list.filter(r => r.type === type);
    }
    if (status && status !== 'ALL') {
      list = list.filter(r => r.status === status);
    }
    return list;
  }

  public getResourceById(id: string): Resource | undefined {
    return this.db.resources.find(r => r.id === id);
  }

  public createResource(data: Omit<Resource, 'id' | 'lastVerifiedAt'>): Resource {
    const id = `RES-${data.type.slice(0, 3)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const now = new Date().toISOString();
    const res: Resource = {
      ...data,
      id,
      lastVerifiedAt: now
    };
    this.db.resources.push(res);
    this.persist();
    return res;
  }

  public updateResource(id: string, updates: Partial<Resource>): Resource | null {
    const idx = this.db.resources.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const updated: Resource = {
      ...this.db.resources[idx],
      ...updates,
      lastVerifiedAt: new Date().toISOString()
    };
    this.db.resources[idx] = updated;
    this.persist();
    return updated;
  }

  // --- Assignments ---
  public getAssignments(incidentId?: string): ResourceAssignment[] {
    let list = [...this.db.assignments];
    if (incidentId) {
      list = list.filter(a => a.incidentId === incidentId);
    }
    return list;
  }

  public getAssignmentById(id: string): ResourceAssignment | undefined {
    return this.db.assignments.find(a => a.id === id);
  }

  public requestAssignment(data: Omit<ResourceAssignment, 'id' | 'requestedAt'>): { success: boolean; assignment?: ResourceAssignment; error?: string } {
    // Conflict detection: verify resource exists and is available
    const resource = this.getResourceById(data.resourceId);
    if (!resource) {
      return { success: false, error: 'Resource not found' };
    }

    if (resource.status !== 'AVAILABLE') {
      return {
        success: false,
        error: `Resource ${resource.name} is currently ${resource.status}${resource.assignedIncidentId ? ` on incident ${resource.assignedIncidentId}` : ''}. Assignment conflict detected.`
      };
    }

    // Check for any pending approval for this same resource
    const existingPending = this.db.assignments.find(
      a => a.resourceId === data.resourceId && (a.status === 'PENDING_APPROVAL' || a.status === 'APPROVED')
    );
    if (existingPending) {
      return {
        success: false,
        error: `Resource ${resource.name} already has a pending or active assignment on incident ${existingPending.incidentId}.`
      };
    }

    const id = `ASG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const assignment: ResourceAssignment = {
      ...data,
      id,
      requestedAt: new Date().toISOString()
    };

    this.db.assignments.push(assignment);
    this.persist();
    return { success: true, assignment };
  }

  public approveAssignment(assignmentId: string, operatorName: string): { success: boolean; assignment?: ResourceAssignment; error?: string } {
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.status !== 'PENDING_APPROVAL') {
      return { success: false, error: `Assignment is already in status: ${assignment.status}` };
    }

    const resource = this.getResourceById(assignment.resourceId);
    if (!resource) {
      return { success: false, error: 'Assigned resource record missing' };
    }

    // Atomic conflict check before finalizing
    if (resource.status !== 'AVAILABLE' && resource.assignedIncidentId !== assignment.incidentId) {
      return {
        success: false,
        error: `Conflict detected: ${resource.name} was acquired by another incident (${resource.assignedIncidentId}) before approval.`
      };
    }

    // Update assignment
    assignment.status = 'APPROVED';
    assignment.approvedAt = new Date().toISOString();
    assignment.approvedBy = operatorName;

    // Update resource state
    resource.status = 'ASSIGNED';
    resource.assignedIncidentId = assignment.incidentId;

    // Update incident status if needed
    const incident = this.getIncidentById(assignment.incidentId);
    if (incident && (incident.status === 'RECEIVED' || incident.status === 'UNDER_REVIEW')) {
      incident.status = 'RESOURCES_DISPATCHED';
    }

    this.persist();
    return { success: true, assignment };
  }

  public rejectAssignment(assignmentId: string, rejectionReason: string): { success: boolean; assignment?: ResourceAssignment; error?: string } {
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.status !== 'PENDING_APPROVAL') {
      return { success: false, error: `Assignment is already in status: ${assignment.status}` };
    }

    assignment.status = 'REJECTED';
    assignment.rejectionReason = rejectionReason;
    this.persist();
    return { success: true, assignment };
  }

  public releaseAssignment(assignmentId: string): { success: boolean; assignment?: ResourceAssignment; error?: string } {
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    assignment.status = 'RELEASED';
    assignment.releasedAt = new Date().toISOString();

    const resource = this.getResourceById(assignment.resourceId);
    if (resource && resource.assignedIncidentId === assignment.incidentId) {
      resource.status = 'AVAILABLE';
      resource.assignedIncidentId = null;
    }

    this.persist();
    return { success: true, assignment };
  }

  // --- Agent Runs & Events ---
  public getAgentRuns(incidentId?: string): AgentRun[] {
    let list = [...this.db.agentRuns];
    if (incidentId) {
      list = list.filter(r => r.incidentId === incidentId);
    }
    list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return list;
  }

  public getAgentRunById(runId: string): AgentRun | undefined {
    return this.db.agentRuns.find(r => r.id === runId);
  }

  public saveAgentRun(run: AgentRun): void {
    const idx = this.db.agentRuns.findIndex(r => r.id === run.id);
    if (idx >= 0) {
      this.db.agentRuns[idx] = run;
    } else {
      this.db.agentRuns.unshift(run);
    }
    this.persist();
  }

  public recordAgentEvent(event: AgentEvent): void {
    this.db.agentEvents.push(event);
    this.persist();
  }

  public getAgentEvents(runId: string): AgentEvent[] {
    return this.db.agentEvents
      .filter(e => e.runId === runId)
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }

  // --- Notes ---
  public getNotes(incidentId: string): IncidentNote[] {
    return this.db.incidentNotes
      .filter(n => n.incidentId === incidentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addNote(data: Omit<IncidentNote, 'id' | 'createdAt'>): IncidentNote {
    const note: IncidentNote = {
      ...data,
      id: `NOT-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };
    this.db.incidentNotes.push(note);
    this.persist();
    return note;
  }

  // --- Notifications ---
  public getNotifications(role?: string, userId?: string): Notification[] {
    let list = [...this.db.notifications];
    if (role && role !== 'admin') {
      list = list.filter(n => !n.targetRole || n.targetRole === role || n.userId === userId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  public addNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
    const notif: Notification = {
      ...data,
      id: `NTF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.db.notifications.unshift(notif);
    this.persist();
    return notif;
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.db.notifications.find(n => n.id === id);
    if (!notif) return false;
    notif.isRead = true;
    this.persist();
    return true;
  }

  public markAllNotificationsRead(role?: string): void {
    for (const notif of this.db.notifications) {
      if (!role || !notif.targetRole || notif.targetRole === role) {
        notif.isRead = true;
      }
    }
    this.persist();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.db.auditLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      createdAt: new Date().toISOString()
    };
    this.db.auditLogs.unshift(entry);
    this.persist();
    return entry;
  }

  // --- Dashboard Summary ---
  public getDashboardSummary(): DashboardSummary {
    const incidents = this.db.incidents;
    const resources = this.db.resources;

    const totalActive = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
    const awaitingReview = incidents.filter(i => i.status === 'RECEIVED' || i.status === 'UNDER_REVIEW').length;
    const highOrCriticalPriority = incidents.filter(
      i => (i.priority === 'CRITICAL' || i.priority === 'HIGH') && i.status !== 'RESOLVED' && i.status !== 'CLOSED'
    ).length;

    const availableUnits = resources.filter(r => r.status === 'AVAILABLE').length;
    const assignedUnits = resources.filter(r => r.status === 'ASSIGNED' || r.status === 'EN_ROUTE' || r.status === 'ON_SCENE').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

    const priorityCounts = {
      CRITICAL: incidents.filter(i => i.priority === 'CRITICAL').length,
      HIGH: incidents.filter(i => i.priority === 'HIGH').length,
      MEDIUM: incidents.filter(i => i.priority === 'MEDIUM').length,
      LOW: incidents.filter(i => i.priority === 'LOW').length,
      UNASSESSED: incidents.filter(i => i.priority === 'UNASSESSED').length
    };

    const categoryCounts = {
      ROAD_ACCIDENT: incidents.filter(i => i.category === 'ROAD_ACCIDENT').length,
      MEDICAL_EMERGENCY: incidents.filter(i => i.category === 'MEDICAL_EMERGENCY').length,
      FIRE_INCIDENT: incidents.filter(i => i.category === 'FIRE_INCIDENT').length,
      FLOOD: incidents.filter(i => i.category === 'FLOOD').length,
      NATURAL_DISASTER: incidents.filter(i => i.category === 'NATURAL_DISASTER').length,
      PUBLIC_SAFETY: incidents.filter(i => i.category === 'PUBLIC_SAFETY').length,
      OTHER: incidents.filter(i => i.category === 'OTHER').length
    };

    const statusCounts = {
      RECEIVED: incidents.filter(i => i.status === 'RECEIVED').length,
      UNDER_REVIEW: incidents.filter(i => i.status === 'UNDER_REVIEW').length,
      RESOURCES_DISPATCHED: incidents.filter(i => i.status === 'RESOURCES_DISPATCHED').length,
      ON_SCENE: incidents.filter(i => i.status === 'ON_SCENE').length,
      RESOLVED: incidents.filter(i => i.status === 'RESOLVED').length,
      CLOSED: incidents.filter(i => i.status === 'CLOSED').length
    };

    return {
      totalActive,
      awaitingReview,
      highOrCriticalPriority,
      availableUnits,
      assignedUnits,
      resolvedIncidents,
      priorityCounts,
      categoryCounts,
      statusCounts
    };
  }

  // --- Verified Emergency Facilities ---
  public getFacilities(filters?: { type?: string; agentDomain?: string }): EmergencyFacility[] {
    let list = this.db.facilities && this.db.facilities.length > 0 ? [...this.db.facilities] : [...INITIAL_FACILITIES];
    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter(f => f.type === filters.type);
    }
    if (filters?.agentDomain && filters.agentDomain !== 'ALL') {
      list = list.filter(f => f.agentDomain === filters.agentDomain);
    }
    return list;
  }
}

export const dbService = new DatabaseService();
