# 🔒 Security Guide for Siphera

## 🚨 Critical Security Issues (FIXED)

### ✅ AWS Credentials Exposure (RESOLVED)
- **Issue**: AWS credentials were being logged to console
- **Fix**: Removed credential logging and implemented secure configuration management
- **Status**: ✅ RESOLVED

### ✅ Private Key Storage Security (IMPROVED)
- **Issue**: Private keys stored in plain text localStorage
- **Fix**: Implemented secure key storage with encryption and memory-first approach
- **Status**: ✅ IMPROVED

## 🔐 Current Security Measures

### 1. Environment Variable Management
- AWS credentials stored in `.env` file (not committed to git)
- Secure configuration validation on startup
- No credential logging in production

### 2. End-to-End Encryption
- Messages encrypted client-side before transmission
- AES-256-CBC encryption for message content
- Public/private key pairs for key exchange
- **NEW**: Secure key storage with encryption

### 3. Private Key Storage Security
- **Memory-first storage**: Keys stored in memory when possible (most secure)
- **Encrypted localStorage**: Fallback with encryption when memory not available
- **Key encryption**: Private keys encrypted before storage
- **Security levels**: Multiple storage options with different security levels

### 4. Authentication
- AWS Cognito integration for user authentication
- JWT tokens for session management
- Secure password handling

### 5. Network Security
- CORS configuration for cross-origin requests
- Helmet.js for security headers
- HTTPS enforcement in production

## 🔑 Private Key Storage Security Levels

### Level 1: Memory-Only Storage (Most Secure)
- **Security**: ✅ Highest
- **Persistence**: ❌ Lost on page refresh
- **Use Case**: High-security environments, temporary sessions
- **Implementation**: Keys stored only in JavaScript memory

### Level 2: Encrypted localStorage (Medium Security)
- **Security**: ⚠️ Medium (vulnerable to XSS)
- **Persistence**: ✅ Survives page refresh
- **Use Case**: Development, low-risk environments
- **Implementation**: Keys encrypted before storage

### Level 3: Web Crypto API (Future Enhancement)
- **Security**: ✅ High
- **Persistence**: ✅ Secure persistence
- **Use Case**: Production environments
- **Implementation**: Using browser's secure crypto storage

### Level 4: Hardware Security Modules (Production)
- **Security**: ✅ Highest
- **Persistence**: ✅ Secure persistence
- **Use Case**: Enterprise production
- **Implementation**: HSM integration

## 🛡️ Security Recommendations

### Immediate Actions Required

1. **Rotate AWS Credentials**
   ```bash
   # Generate new AWS access keys
   aws iam create-access-key --user-name your-username
   
   # Update .env file with new credentials
   AWS_ACCESS_KEY_ID=your_new_access_key
   AWS_SECRET_ACCESS_KEY=your_new_secret_key
   ```

2. **Use IAM Roles Instead of Access Keys**
   ```bash
   # For production, use IAM roles instead of access keys
   # Remove AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from .env
   # Configure EC2 instance profile or ECS task role
   ```

3. **Enable AWS CloudTrail**
   ```bash
   # Monitor AWS API calls
   aws cloudtrail create-trail --name siphera-trail --s3-bucket-name your-log-bucket
   ```

### Private Key Security Improvements

1. **For Development**
   - Current implementation is adequate for development
   - Keys are encrypted in localStorage
   - Memory-first approach provides good security

2. **For Production**
   - Implement Web Crypto API for secure key storage
   - Use hardware security modules (HSM) for enterprise
   - Implement key derivation from user passwords
   - Add key rotation policies

3. **Key Management Best Practices**
   ```javascript
   // Example: Key derivation from user password
   const derivedKey = await crypto.subtle.deriveBits(
     { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
     passwordKey,
     256
   );
   ```

### Production Security Checklist

- [ ] **HTTPS Only**: Configure SSL certificates
- [ ] **Rate Limiting**: Implement API rate limiting
- [ ] **Input Validation**: Server-side validation for all inputs
- [ ] **SQL Injection Protection**: Use parameterized queries (DynamoDB handles this)
- [ ] **XSS Protection**: Sanitize user inputs
- [ ] **CSRF Protection**: Implement CSRF tokens
- [ ] **Security Headers**: Configure proper security headers
- [ ] **Logging**: Implement secure logging (no sensitive data)
- [ ] **Monitoring**: Set up security monitoring and alerting
- [ ] **Backup**: Regular encrypted backups
- [ ] **Updates**: Keep dependencies updated
- [ ] **Key Storage**: Implement secure key storage (Web Crypto API or HSM)
- [ ] **Key Rotation**: Implement key rotation policies

### Encryption Best Practices

1. **Key Management**
   - Use AWS KMS for key management in production
   - Implement key rotation policies
   - Store keys securely (not in localStorage for production)

2. **Perfect Forward Secrecy**
   - Generate new session keys for each conversation
   - Implement key derivation functions
   - Use ephemeral keys

3. **Message Integrity**
   - Implement message signing
   - Use HMAC for message authentication
   - Verify message authenticity

## 🔍 Security Testing

### Automated Security Testing
```bash
# Install security testing tools
npm install --save-dev eslint-plugin-security
npm install --save-dev @typescript-eslint/eslint-plugin

# Run security audit
npm audit

# Run dependency vulnerability scan
npm audit fix
```

### Manual Security Testing
1. **Authentication Testing**
   - Test login/logout flows
   - Verify session management
   - Test password reset functionality

2. **Authorization Testing**
   - Verify user can only access their own data
   - Test admin vs user permissions
   - Check for privilege escalation

3. **Encryption Testing**
   - Verify messages are encrypted in transit
   - Test key exchange process
   - Verify message decryption

4. **Key Storage Testing**
   - Test key persistence across sessions
   - Verify key encryption in storage
   - Test key recovery mechanisms

## 🚨 Incident Response

### If Credentials Are Compromised
1. **Immediate Actions**
   - Rotate all AWS credentials
   - Revoke compromised access keys
   - Check AWS CloudTrail for unauthorized access
   - Notify security team

2. **Investigation**
   - Review logs for suspicious activity
   - Check for data exfiltration
   - Assess impact scope

3. **Recovery**
   - Restore from clean backups if needed
   - Update security measures
   - Document lessons learned

### If Private Keys Are Compromised
1. **Immediate Actions**
   - Generate new key pairs for all users
   - Revoke compromised keys
   - Notify affected users
   - Implement key rotation

2. **Investigation**
   - Determine how keys were compromised
   - Check for unauthorized access
   - Assess scope of compromise

3. **Recovery**
   - Implement new key management system
   - Update security protocols
   - Provide secure key backup/restore

## 📋 Security Configuration Files

### .env.example (Template)
```bash
# Server Configuration
PORT=3007
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production

# AWS Configuration (Use IAM roles in production)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=  # Remove for production
# AWS_SECRET_ACCESS_KEY=  # Remove for production

# Cognito Configuration
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_IDENTITY_POOL_ID=your_identity_pool_id
COGNITO_CLIENT_ID=your_client_id

# Security Configuration
JWT_SECRET=your_very_long_random_secret
ENCRYPTION_KEY=your_encryption_key

# DynamoDB Tables
USERS_TABLE=siphera-users-prod
MESSAGES_TABLE=siphera-messages-prod
SESSIONS_TABLE=siphera-sessions-prod
```

### Security Headers (helmet.js)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🔗 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-learning/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Key Management Best Practices](https://www.nist.gov/publications/key-management-guideline)

## 📞 Security Contact

For security issues or questions:
- Create a private security issue in the repository
- Contact the security team directly
- Follow responsible disclosure practices

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular audits, updates, and monitoring are essential for maintaining a secure application. 