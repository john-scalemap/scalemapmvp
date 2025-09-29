# Cognito Configuration Reference - Browser-Based Apps

**Status:** Authoritative
**Last Updated:** 2025-09-29
**Purpose:** Correct Cognito configuration for browser-based applications (NO secret hash required)

## 🚨 **Critical Rule: No Secret Hash for Browser Apps**

**IMPORTANT:** Browser-based applications (React, Vue, Angular) should NEVER use `clientSecret` or `secretHash`. This is a common misconfiguration that causes authentication failures.

---

## 1. **Current Production Configuration**

### **AWS Cognito User Pool Settings**
```bash
# User Pool Configuration
USER_POOL_ID=eu-west-1_iGWQ7N6sH
REGION=eu-west-1
USER_POOL_ARN=arn:aws:cognito-idp:eu-west-1:884337373956:userpool/eu-west-1_iGWQ7N6sH

# App Client Configuration
CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
CLIENT_NAME=ScaleMapWebClient
```

### **App Client Settings (Critical)**
```json
{
  "ClientId": "6e7ct8tmbmhgvva2ngdn5hi6v1",
  "ClientName": "ScaleMapWebClient",
  "GenerateSecret": false,           // ✅ MUST be false for browser apps
  "RefreshTokenValidity": 30,
  "AccessTokenValidity": 24,
  "IdTokenValidity": 24,
  "TokenValidityUnits": {
    "AccessToken": "hours",
    "IdToken": "hours",
    "RefreshToken": "days"
  },
  "ExplicitAuthFlows": [
    "ALLOW_USER_SRP_AUTH",           // ✅ Secure Remote Password
    "ALLOW_REFRESH_TOKEN_AUTH"       // ✅ Token refresh
  ],
  "PreventUserExistenceErrors": "ENABLED",
  "EnableTokenRevocation": true,
  "AuthSessionValidity": 3           // 3 minutes for auth session
}
```

---

## 2. **Frontend Configuration (React)**

### **Correct Configuration**
```typescript
// client/src/lib/cognito.ts
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

// ✅ CORRECT: No clientSecret for browser apps
const poolData = {
  UserPoolId: 'eu-west-1_iGWQ7N6sH',
  ClientId: '6e7ct8tmbmhgvva2ngdn5hi6v1'
  // NO clientSecret property - this is correct for browser apps
};

const userPool = new CognitoUserPool(poolData);

// ✅ CORRECT: Authentication without secret hash
export const authenticateUser = (username: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const authenticationData = {
      Username: username,
      Password: password
      // NO secretHash required for browser apps
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const userData = {
      Username: username,
      Pool: userPool
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      }
    });
  });
};
```

### **Environment Variables (Build-time)**
```bash
# .env or build environment
VITE_COGNITO_USER_POOL_ID=eu-west-1_iGWQ7N6sH
VITE_COGNITO_CLIENT_ID=6e7ct8tmbmhgvva2ngdn5hi6v1
VITE_AWS_REGION=eu-west-1

# ❌ NEVER include these in frontend builds:
# VITE_COGNITO_CLIENT_SECRET=xxxxx     # DON'T DO THIS
# VITE_COGNITO_SECRET_HASH=xxxxx       # DON'T DO THIS
```

---

## 3. **Backend Configuration (Node.js/Express)**

### **Server-Side Cognito Configuration**
```typescript
// server/cognitoAuth.ts
import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ✅ CORRECT: Server can use admin operations
const cognitoClient = new CognitoIdentityProviderClient({
  region: 'eu-west-1'
});

const USER_POOL_ID = 'eu-west-1_iGWQ7N6sH';
const CLIENT_ID = '6e7ct8tmbmhgvva2ngdn5hi6v1';

// JWT verification setup
const client = jwksClient({
  jwksUri: `https://cognito-idp.eu-west-1.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
});

// ✅ CORRECT: Verify JWT tokens from frontend
export const verifyToken = async (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: `https://cognito-idp.eu-west-1.amazonaws.com/${USER_POOL_ID}`,
      audience: CLIENT_ID
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) callback(err);
    else callback(null, key?.getPublicKey());
  });
}
```

---

## 4. **Common Configuration Errors**

### **❌ Error #1: Including clientSecret in Frontend**
```typescript
// ❌ WRONG - Never do this in browser apps
const poolData = {
  UserPoolId: 'eu-west-1_iGWQ7N6sH',
  ClientId: '6e7ct8tmbmhgvva2ngdn5hi6v1',
  ClientSecret: 'some-secret'  // ❌ SECURITY RISK
};
```

**Why wrong:** Client secrets can't be kept secret in browser apps. Anyone can view source code.

### **❌ Error #2: Generating secretHash**
```typescript
// ❌ WRONG - Don't calculate secret hash for browser apps
import crypto from 'crypto';

const secretHash = crypto
  .createHmac('SHA256', clientSecret)
  .update(username + clientId)
  .digest('base64');  // ❌ NOT needed for browser apps
```

**Why wrong:** If your browser app needs secret hash, your Cognito app client is misconfigured.

### **❌ Error #3: Wrong Auth Flows**
```json
// ❌ WRONG - Don't enable admin-only auth flows for browser clients
{
  "ExplicitAuthFlows": [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",  // ❌ Admin only
    "ALLOW_USER_PASSWORD_AUTH"         // ❌ Less secure
  ]
}
```

**Fix:** Use SRP authentication only:
```json
// ✅ CORRECT
{
  "ExplicitAuthFlows": [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
```

---

## 5. **Verification Procedures**

### **Check App Client Configuration**
```bash
# Verify app client settings
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --region eu-west-1 \
  --query 'UserPoolClient.{GenerateSecret:GenerateSecret,ExplicitAuthFlows:ExplicitAuthFlows}'

# Expected output:
# {
#   "GenerateSecret": false,           // ✅ Must be false
#   "ExplicitAuthFlows": [
#     "ALLOW_USER_SRP_AUTH",          // ✅ Correct
#     "ALLOW_REFRESH_TOKEN_AUTH"      // ✅ Correct
#   ]
# }
```

### **Test Authentication Flow**
```bash
# Test frontend authentication (should NOT require secret)
curl -X POST https://d2nr28qnjfjgb5.cloudfront.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "testpassword"
  }'

# Should return success without secret hash errors
```

### **Check Frontend Build**
```bash
# Verify frontend build doesn't contain client secrets
grep -r "client.*secret\|secret.*hash" dist/
# Should return no results

# Check for correct Cognito config
grep -r "eu-west-1_iGWQ7N6sH" dist/assets/*.js
# Should find the User Pool ID
```

---

## 6. **Fix Procedures**

### **If App Client Has Secret Generation Enabled**
```bash
# Update existing app client (ScaleMapWebClient)
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --generate-secret false \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region eu-west-1

# This ensures the existing app client has correct settings
```

### **If Frontend Shows Secret Hash Errors**
1. **Check app client configuration** (use command above)
2. **Remove any secret hash code** from frontend
3. **Rebuild frontend** with correct configuration
4. **Redeploy** both frontend and backend

### **Emergency Fix Script**
```bash
#!/bin/bash
# Emergency Cognito configuration fix

echo "Checking current app client configuration..."
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \
  --region eu-west-1

echo "If GenerateSecret is true, run the following:"
echo "aws cognito-idp update-user-pool-client \\"
echo "  --user-pool-id eu-west-1_iGWQ7N6sH \\"
echo "  --client-id 6e7ct8tmbmhgvva2ngdn5hi6v1 \\"
echo "  --generate-secret false \\"
echo "  --region eu-west-1"
```

---

## 7. **Troubleshooting Guide**

### **Error: "Unable to verify secret hash for client"**
**Cause:** App client is configured with secret generation, but frontend doesn't send secret hash
**Fix:** Disable secret generation for the app client

### **Error: "NotAuthorizedException: Incorrect username or password"**
**Possible Causes:**
1. Wrong credentials (most common)
2. User not confirmed
3. Wrong auth flow configuration

**Debug:**
```bash
# Check user status
aws cognito-idp admin-get-user \
  --user-pool-id eu-west-1_iGWQ7N6sH \
  --username [EMAIL] \
  --region eu-west-1 \
  --query 'UserStatus'
```

### **Error: "InvalidParameterException: Auth flow not supported"**
**Cause:** App client doesn't have correct auth flows enabled
**Fix:** Update app client with `ALLOW_USER_SRP_AUTH`

---

## 8. **Security Best Practices**

### **Frontend Security**
- ✅ Never include client secrets in frontend code
- ✅ Use SRP authentication for secure password handling
- ✅ Store tokens securely (httpOnly cookies or secure storage)
- ✅ Implement proper token refresh logic

### **Backend Security**
- ✅ Always verify JWT tokens from Cognito
- ✅ Use HTTPS for all authentication endpoints
- ✅ Implement proper CORS configuration
- ✅ Use admin operations only when necessary

### **App Client Security**
- ✅ Disable secret generation for browser clients
- ✅ Enable token revocation
- ✅ Set appropriate token expiry times
- ✅ Use specific auth flows only

---

## 📋 **Configuration Checklist**

### **App Client Setup**
- [ ] `GenerateSecret: false`
- [ ] `ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]`
- [ ] `PreventUserExistenceErrors: ENABLED`
- [ ] `EnableTokenRevocation: true`

### **Frontend Configuration**
- [ ] No clientSecret in configuration
- [ ] No secret hash calculation
- [ ] Correct User Pool ID and Client ID
- [ ] Proper error handling for auth failures

### **Backend Configuration**
- [ ] JWT verification with JWKS
- [ ] Correct issuer and audience validation
- [ ] Proper error handling
- [ ] Secure token storage recommendations

---

**Changelog:**
- 2025-09-29: Initial Cognito configuration reference for browser apps