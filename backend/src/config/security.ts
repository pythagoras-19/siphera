import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SecurityConfig {
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  server: {
    port: number;
    corsOrigin: string;
    nodeEnv: string;
  };
  cognito: {
    userPoolId: string;
    identityPoolId: string;
    clientId: string;
  };
  dynamodb: {
    usersTable: string;
    messagesTable: string;
    sessionsTable: string;
  };
}

export function validateSecurityConfig(): SecurityConfig {
  const config: SecurityConfig = {
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
    server: {
      port: parseInt(process.env.PORT || '3007', 10),
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    cognito: {
      userPoolId: process.env.COGNITO_USER_POOL_ID || '',
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || '',
      clientId: process.env.COGNITO_CLIENT_ID || '',
    },
    dynamodb: {
      usersTable: process.env.USERS_TABLE || 'siphera-users-dev',
      messagesTable: process.env.MESSAGES_TABLE || 'siphera-messages-dev',
      sessionsTable: process.env.SESSIONS_TABLE || 'siphera-sessions-dev',
    },
  };

  // Validate required AWS credentials
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
    throw new Error('Missing required AWS credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set');
  }

  // Validate Cognito configuration
  if (!config.cognito.userPoolId || !config.cognito.clientId) {
    console.warn('⚠️  Cognito configuration incomplete. Authentication features may not work properly.');
  }

  return config;
}

// Export a singleton instance
export const securityConfig = validateSecurityConfig();

// Helper function to get AWS credentials without logging them
export function getAwsCredentials() {
  return {
    region: securityConfig.aws.region,
    credentials: {
      accessKeyId: securityConfig.aws.accessKeyId,
      secretAccessKey: securityConfig.aws.secretAccessKey,
      ...(securityConfig.aws.sessionToken && { sessionToken: securityConfig.aws.sessionToken }),
    },
  };
} 