import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Parse COGNITO_CONFIG if provided (ECS secrets format)
let COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
let COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

if (process.env.COGNITO_CONFIG) {
  try {
    const config = JSON.parse(process.env.COGNITO_CONFIG);
    COGNITO_USER_POOL_ID = config.userPoolId;
    COGNITO_CLIENT_ID = config.clientId;
  } catch (error) {
    console.error('Failed to parse COGNITO_CONFIG:', error);
  }
}

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION
});

const client = jwksClient({
  jwksUri: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

function getPublicKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["given_name"],
    lastName: claims["family_name"],
    profileImageUrl: claims["picture"],
  });
}

export async function setupAuth(app: Express) {
  // No session middleware needed for JWT-based auth
  // Trust proxy for secure cookies in production
  app.set("trust proxy", 1);
}

export const validateJWT: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, getPublicKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
        audience: COGNITO_CLIENT_ID
      }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Ensure user exists in database
    await upsertUser(decoded);

    // Attach user claims to request
    (req as any).user = { claims: decoded };
    next();
  } catch (error) {
    console.error('JWT validation error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Legacy compatibility - keep the same interface as replitAuth
export const isAuthenticated = validateJWT;

export async function getCognitoUser(userId: string) {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID!,
      Username: userId,
    });

    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error('Error getting Cognito user:', error);
    throw error;
  }
}