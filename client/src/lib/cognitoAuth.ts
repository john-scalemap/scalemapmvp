import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  ISignUpResult,
  CognitoUserSession
} from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID!,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID!
});

export class CognitoAuthService {
  async signIn(email: string, password: string): Promise<string> {
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
        onSuccess: (session: CognitoUserSession) => {
          const idToken = session.getIdToken().getJwtToken();
          localStorage.setItem('accessToken', idToken);
          resolve(idToken);
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
          reject(err);
        },
        newPasswordRequired: () => {
          reject(new Error('New password required - not implemented'));
        }
      });
    });
  }

  async signUp(email: string, password: string, firstName: string, lastName: string): Promise<ISignUpResult> {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: email,
        }),
        new CognitoUserAttribute({
          Name: 'given_name',
          Value: firstName,
        }),
        new CognitoUserAttribute({
          Name: 'family_name',
          Value: lastName,
        }),
      ];

      userPool.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          console.error('Sign up failed:', err);
          reject(err);
        } else if (result) {
          resolve(result);
        }
      });
    });
  }

  async confirmRegistration(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          console.error('Confirmation failed:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async signOut(): Promise<void> {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    localStorage.removeItem('accessToken');
  }

  async forgotPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          console.error('Forgot password failed:', err);
          reject(err);
        },
        inputVerificationCode: () => {
          // This callback is for UI to handle verification code input
          resolve();
        }
      });
    });
  }

  async confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          console.error('Confirm password failed:', err);
          reject(err);
        }
      });
    });
  }

  getCurrentToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    const token = this.getCurrentToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
}

export const cognitoAuth = new CognitoAuthService();