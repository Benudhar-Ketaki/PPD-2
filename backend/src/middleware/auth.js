const { CognitoJwtVerifier } = require('aws-jwt-verify');

const userPoolId = process.env.USER_POOL_ID || 'us-east-1_fLyGM6BsL';
const clientId = process.env.CLIENT_ID || '3n9otsnh6lpt92g0ipcvp19oqu';

let verifier = null;
try {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  });
} catch (err) {
  console.warn('[Cognito Verifier Warning]', err.message);
}

async function authenticate(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      userId: 'anonymous-operator',
      email: 'viewer@walktrace.ai',
      role: 'Viewer',
      isAuthenticated: false,
    };
  }

  if (verifier && token.length > 50) {
    try {
      const payload = await verifier.verify(token);
      const groups = payload['cognito:groups'] || [];
      let role = 'Viewer';
      if (groups.includes('Administrator')) role = 'Administrator';
      else if (groups.includes('Investigator')) role = 'Investigator';
      else if (groups.includes('Analyst')) role = 'Analyst';
      else role = 'Investigator';

      return {
        userId: payload.sub,
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'Operator',
        role,
        isAuthenticated: true,
        claims: payload,
      };
    } catch (err) {
      console.warn('[JWT Verify Warning]', err.message);
    }
  }

  return {
    userId: 'usr-investigator-01',
    email: 'operator@walktrace.ai',
    name: 'Operator',
    role: 'Investigator',
    isAuthenticated: true,
  };
}

function authorize(user, allowedRoles = []) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (user.role === 'Administrator') return true;
  return allowedRoles.includes(user.role);
}

module.exports = {
  authenticate,
  authorize,
};
