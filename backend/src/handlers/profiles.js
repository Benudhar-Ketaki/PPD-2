const { v4: uuidv4 } = require('uuid');
const { success, error } = require('../utils/response');
const { db } = require('../services/aws');
const { authenticate, authorize } = require('../middleware/auth');

const INITIAL_PROFILES = [
  { profileId: 'WT-0104', displayName: 'Enrolled Subject 104', sequences: 12, category: 'Authorized Staff', status: 'Active', enrolledDate: '12 Nov 2026' },
  { profileId: 'WT-0087', displayName: 'Enrolled Subject 087', sequences: 9, category: 'Contractor', status: 'Active', enrolledDate: '10 Nov 2026' },
  { profileId: 'WT-0062', displayName: 'Enrolled Subject 062', sequences: 7, category: 'Visitor', status: 'Review', enrolledDate: '08 Nov 2026' },
  { profileId: 'WT-0045', displayName: 'Enrolled Subject 045', sequences: 14, category: 'Security Ops', status: 'Active', enrolledDate: '05 Nov 2026' },
  { profileId: 'WT-0031', displayName: 'Enrolled Subject 031', sequences: 6, category: 'Logistics', status: 'Active', enrolledDate: '01 Nov 2026' },
  { profileId: 'WT-0019', displayName: 'Enrolled Subject 019', sequences: 4, category: 'Temporary Pass', status: 'Archived', enrolledDate: '28 Oct 2026' },
];

exports.listProfiles = async (event) => {
  await authenticate(event);
  const items = await db.queryGSI1('PROFILES');
  const profiles = items.length > 0 ? items : INITIAL_PROFILES;
  return success({ profiles, total: profiles.length });
};

exports.createProfile = async (event) => {
  const user = await authenticate(event);
  if (!authorize(user, ['Administrator', 'Investigator'])) {
    return error('Forbidden: Role insufficient to enroll profiles.', 403);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return error('Invalid JSON');
  }

  const profileId = body.profileId || `WT-${uuidv4().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  const profileItem = {
    PK: `PROFILE#${profileId}`,
    SK: 'METADATA',
    GSI1PK: 'PROFILES',
    GSI1SK: now,
    profileId,
    displayName: body.displayName || `Subject ${profileId}`,
    category: body.category || 'General Staff',
    sequences: body.sequences || 6,
    status: 'Active',
    enrolledDate: now.split('T')[0],
    enrolledBy: user.email,
  };

  await db.put(profileItem);
  return success(profileItem, 201);
};

exports.getProfileById = async (event) => {
  await authenticate(event);
  const profileId = event.pathParameters?.profileId;
  const profile = await db.get(`PROFILE#${profileId}`, 'METADATA') || 
    INITIAL_PROFILES.find((p) => p.profileId === profileId);

  if (!profile) return error('Profile not found', 404);
  return success(profile);
};
