import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Incident, ResourceAssignment, User, AuditLog } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Connection validation test per Firebase skill instructions
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }
    // Document not existing is still a successful network roundtrip
    return true;
  }
}
testConnection();

// Standardized error handling per Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Helpers
export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  } catch (error) {
    console.error('Failed to sign in with Google:', error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Failed to sign out of Firebase:', error);
    throw error;
  }
}

// User Profile Persistence
export async function syncUserProfile(fbUser: FirebaseUser, role: 'reporter' | 'operator' | 'admin' = 'operator'): Promise<User> {
  const path = `users/${fbUser.uid}`;
  const now = new Date().toISOString();
  
  try {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const existingSnap = await getDoc(userDocRef);
    
    // Determine admin role if matching admin email
    const assignedRole = fbUser.email?.toLowerCase() === 'darshansraichur12@gmail.com' ? 'admin' : role;
    
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      const updatedUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || data.name || 'Responder',
        email: fbUser.email || data.email || '',
        role: data.role || assignedRole,
        organization: data.organization || 'Emergency Response Fleet',
        createdAt: data.createdAt || now,
      };
      
      await updateDoc(userDocRef, {
        name: updatedUser.name,
        updatedAt: now,
      });
      return updatedUser;
    } else {
      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Authorized Responder',
        email: fbUser.email || '',
        role: assignedRole,
        organization: 'Emergency Operations Command',
        createdAt: now,
      };
      
      await setDoc(userDocRef, {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization,
        createdAt: now,
        updatedAt: now,
      });
      return newUser;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Incident Persistence & Real-time Sync
export async function saveIncidentToFirestore(incident: Incident): Promise<void> {
  const path = `incidents/${incident.id}`;
  try {
    const docRef = doc(db, 'incidents', incident.id);
    await setDoc(docRef, {
      id: incident.id,
      title: incident.title,
      category: incident.category,
      description: incident.description,
      status: incident.status,
      priority: incident.priority,
      casualtiesCount: incident.casualtiesCount || 0,
      reporterId: incident.reporterId || auth.currentUser?.uid || 'system',
      reporterName: incident.reporterName || 'Tactical Operator',
      assignedOperatorId: incident.assignedOperatorId || '',
      assignedOperatorName: incident.assignedOperatorName || '',
      notes: incident.notes || '',
      createdAt: incident.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateIncidentInFirestore(
  incidentId: string,
  updates: Partial<Pick<Incident, 'status' | 'priority' | 'assignedOperatorId' | 'assignedOperatorName' | 'notes' | 'casualtiesCount'>>
): Promise<void> {
  const path = `incidents/${incidentId}`;
  try {
    const docRef = doc(db, 'incidents', incidentId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToFirestoreIncidents(
  onUpdate: (incidents: Incident[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'incidents';
  try {
    const q = query(collection(db, path), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const incidents: Incident[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          incidents.push({
            id: data.id || d.id,
            title: data.title || 'Untitled Incident',
            category: data.category || 'OTHER',
            description: data.description || '',
            status: data.status || 'RECEIVED',
            priority: data.priority || 'UNASSESSED',
            location: data.location || {
              address: 'Metro Tactical Sector',
              latitude: 37.7749,
              longitude: -122.4194,
              verified: true,
            },
            casualtiesCount: data.casualtiesCount || 0,
            reporterId: data.reporterId,
            reporterName: data.reporterName,
            assignedOperatorId: data.assignedOperatorId,
            assignedOperatorName: data.assignedOperatorName,
            notes: data.notes,
            isDemo: false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        onUpdate(incidents);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Dispatch Persistence
export async function saveDispatchToFirestore(dispatch: ResourceAssignment): Promise<void> {
  const path = `dispatches/${dispatch.id}`;
  try {
    const docRef = doc(db, 'dispatches', dispatch.id);
    await setDoc(docRef, {
      id: dispatch.id,
      incidentId: dispatch.incidentId,
      resourceId: dispatch.resourceId,
      resourceName: dispatch.resourceName,
      resourceType: dispatch.resourceType,
      status: dispatch.status,
      distanceKm: dispatch.distanceKm,
      matchScore: dispatch.matchScore,
      requestedAt: dispatch.requestedAt || new Date().toISOString(),
      approvedBy: dispatch.approvedBy || '',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Audit Log Persistence
export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  const path = `auditLogs/${log.id}`;
  try {
    const docRef = doc(db, 'auditLogs', log.id);
    await setDoc(docRef, {
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details || '',
      createdAt: log.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };
