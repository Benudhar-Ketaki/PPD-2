const { success, error } = require('../utils/response');
const { db } = require('../services/aws');
const { authenticate, authorize } = require('../middleware/auth');

const INITIAL_EVENTS = [
  { eventId: 'EV-2408', time: '14:32:15', camera: 'CAM-01', trackId: 'TR-091', profileId: 'WT-0104', displayName: 'Subject 104', similarity: 94.2, reviewStatus: 'Pending Review' },
  { eventId: 'EV-2407', time: '14:29:40', camera: 'CAM-02', trackId: 'TR-089', profileId: 'WT-0087', displayName: 'Subject 087', similarity: 88.7, reviewStatus: 'Pending Review' },
  { eventId: 'EV-2406', time: '14:27:02', camera: 'CAM-03', trackId: 'TR-086', profileId: 'Unknown', displayName: 'Unregistered Track', similarity: 61.4, reviewStatus: 'Unmatched' },
  { eventId: 'EV-2405', time: '14:15:22', camera: 'CAM-04', trackId: 'TR-082', profileId: 'WT-0062', displayName: 'Subject 062', similarity: 91.5, reviewStatus: 'Confirmed' },
];

exports.listEvents = async (event) => {
  await authenticate(event);
  const items = await db.queryGSI1('EVENTS');
  const events = items.length > 0 ? items : INITIAL_EVENTS;
  return success({ events, total: events.length });
};

exports.getEventById = async (event) => {
  await authenticate(event);
  const eventId = event.pathParameters?.eventId;
  const ev = await db.get(`EVENT#${eventId}`, 'METADATA') || 
    INITIAL_EVENTS.find((e) => e.eventId === eventId);

  if (!ev) return error('Event not found', 404);
  return success(ev);
};

exports.reviewEvent = async (event) => {
  const user = await authenticate(event);
  if (!authorize(user, ['Administrator', 'Investigator', 'Analyst'])) {
    return error('Forbidden: Role insufficient to review events.', 403);
  }

  const eventId = event.pathParameters?.eventId;
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return error('Invalid JSON');
  }

  const { status, notes } = body;
  if (!status) return error('Missing review status');

  const updated = {
    eventId,
    reviewStatus: status,
    reviewedBy: user.email,
    reviewerRole: user.role,
    reviewNotes: notes || '',
    reviewedAt: new Date().toISOString(),
  };

  await db.update(
    `EVENT#${eventId}`,
    'METADATA',
    'SET reviewStatus = :status, reviewedBy = :by, reviewedAt = :at',
    {
      ':status': status,
      ':by': user.email,
      ':at': updated.reviewedAt,
    }
  );

  return success({ message: 'Event review updated successfully', event: updated });
};
