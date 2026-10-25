import { Incident, Notification, UserRole } from '../types';
import { dbService } from '../db';
import { PriorityOutput } from './priorityAgent';
import { ResourceCoordinationOutput } from './resourceCoordinationAgent';

export interface PreparedNotification {
  title: string;
  message: string;
  recipientRole: UserRole;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CommunicationOutput {
  notifications: PreparedNotification[];
  createdNotificationIds: string[];
  summary: string;
}

export function runCommunicationAgent(
  incident: Incident,
  priorityOutput: PriorityOutput,
  resourceOutput: ResourceCoordinationOutput
): CommunicationOutput {
  const prepared: PreparedNotification[] = [];

  // Notification 1: Operator Action Required
  const actionTitle = `Incident ${incident.id} [${priorityOutput.recommendedPriority}]: Review Required`;
  const actionMsg = `${incident.title} — ${priorityOutput.explanation} (${resourceOutput.candidateResources.filter(r => !r.conflictDetected).length} units available)`;

  prepared.push({
    title: actionTitle,
    message: actionMsg,
    recipientRole: 'operator',
    priority: priorityOutput.recommendedPriority === 'CRITICAL' ? 'CRITICAL' : priorityOutput.recommendedPriority === 'HIGH' ? 'HIGH' : 'MEDIUM'
  });

  // If unverified location, add special operator alert
  if (!incident.location.verified) {
    prepared.push({
      title: `Unverified Location Alert: ${incident.id}`,
      message: `Caller gave address "${incident.location.address}" without GPS coordinates. Routing is suspended pending coordinate verification.`,
      recipientRole: 'operator',
      priority: 'HIGH'
    });
  }

  // Notification 2: Reporter Notification if reporter is registered
  if (incident.reporterId) {
    prepared.push({
      title: `Emergency Report Logged: ${incident.id}`,
      message: `Your report regarding "${incident.title}" has been assigned tracking ID ${incident.id} and is currently under operator triage.`,
      recipientRole: 'reporter',
      priority: 'LOW'
    });
  }

  // Persist notifications into database
  const createdIds: string[] = [];
  for (const notif of prepared) {
    const created = dbService.addNotification({
      targetRole: notif.recipientRole,
      title: notif.title,
      message: notif.message,
      incidentId: incident.id,
      priority: notif.priority
    });
    createdIds.push(created.id);
  }

  return {
    notifications: prepared,
    createdNotificationIds: createdIds,
    summary: `Generated and dispatched ${prepared.length} operational notifications across operator and reporter channels.`
  };
}
