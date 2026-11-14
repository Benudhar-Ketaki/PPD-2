import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { User } from '../types';

export const COGNITO_CONFIG = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_fLyGM6BsL',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '3n9otsnh6lpt92g0ipcvp19oqu',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
};

const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_CONFIG.userPoolId,
  ClientId: COGNITO_CONFIG.clientId,
});

export class CognitoAuthService {
  /**
   * Register a new user in AWS Cognito User Pool with real email & password.
   * Cognito dispatches an OTP (verification code) to the email.
   */
  static signUp(email: string, password: string, name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
      ];

      if (name) {
        attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: name }));
      }

      userPool.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          console.error('[Cognito SignUp Error]', err);
          reject(err);
          return;
        }
        resolve(result?.user.getUsername() || email);
      });
    });
  }

  /**
   * Confirm registration by verifying the real OTP sent to user's email inbox.
   */
  static verifyOtp(email: string, otpCode: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmRegistration(otpCode, true, (err, result) => {
        if (err) {
          console.error('[Cognito ConfirmRegistration Error]', err);
          reject(err);
          return;
        }
        resolve(result === 'SUCCESS' || true);
      });
    });
  }

  /**
   * Resend confirmation code OTP to the user's real email.
   */
  static resendOtp(email: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          console.error('[Cognito ResendCode Error]', err);
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  /**
   * Authenticate user with Email & Password via real AWS Cognito SRP.
   * Returns authenticated JWT session and claims.
   */
  static signIn(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          const idToken = session.getIdToken();
          const payload = idToken.decodePayload();
          
          // Role determination from Cognito Groups, custom:role, or default to Investigator/Viewer
          const groups = payload['cognito:groups'] || [];
          let userRole: User['role'] = 'Viewer';
          if (groups.includes('Administrator')) userRole = 'Administrator';
          else if (groups.includes('Investigator')) userRole = 'Investigator';
          else if (groups.includes('Analyst')) userRole = 'Analyst';
          else userRole = 'Investigator'; // Default authorized operator

          const userObj: User = {
            email: payload['email'] || email,
            name: payload['name'] || email.split('@')[0],
            role: userRole,
            isLoggedIn: true,
          };

          // Store tokens securely in localStorage
          localStorage.setItem('walktrace_access_token', session.getAccessToken().getJwtToken());
          localStorage.setItem('walktrace_id_token', idToken.getJwtToken());

          resolve(userObj);
        },
        onFailure: (err) => {
          console.error('[Cognito Authenticate Error]', err);
          reject(err);
        },
      });
    });
  }

  /**
   * Sign out current Cognito session.
   */
  static signOut(email: string): void {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });
    cognitoUser.signOut();
    localStorage.removeItem('walktrace_access_token');
    localStorage.removeItem('walktrace_id_token');
  }
}
