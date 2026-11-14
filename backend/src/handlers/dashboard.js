const { success, error } = require('../utils/response');
const { db } = require('../services/aws');
const { authenticate } = require('../middleware/auth');

exports.getOverview = async (event) => {
  const user = await authenticate(event);

  const overviewData = {
    activeCamerasCount: '07 / 08',
    totalTracksToday: 1284,
    enrolledProfilesCount: 246,
    needsReviewCount: 6,
    systemStatus: 'OPERATIONAL',
    nodeRegion: process.env.REGION || 'us-east-1',
    authenticatedUser: {
      email: user.email,
      role: user.role,
    },
    activityByZone: [
      { zone: 'Main Entrance Checkpoint', tracks: 86, percentage: 86 },
      { zone: 'West Corridor Walkway', tracks: 63, percentage: 63 },
      { zone: 'Facility Parking', tracks: 42, percentage: 42 },
      { zone: 'South Lobby Transit', tracks: 29, percentage: 29 },
    ],
  };

  return success(overviewData);
};

exports.getActivity = async (event) => {
  await authenticate(event);

  const activities = [
    { id: 'act-01', type: 'TRACK_ACQUIRED', title: 'Person tracklet acquired', details: 'CAM-01 Main Corridor · Track ID #091', time: 'Just now' },
    { id: 'act-02', type: 'MATCH_GENERATED', title: 'Candidate match generated', details: 'Matched Subject 104 with 94.2% score', time: '2m ago' },
    { id: 'act-03', type: 'MANUAL_REVIEW', title: 'Operator review required', details: 'CAM-04 low-light sequence needs sign-off', time: '5m ago' },
    { id: 'act-04', type: 'CAMERA_ONLINE', title: 'Camera CAM-06 reconnected', details: 'Loading Bay Access stream 30 FPS', time: '12m ago' },
  ];

  return success({ activities, total: activities.length });
};
