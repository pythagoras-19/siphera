import { E2EEncryption, KeyPair } from '../utils/encryption';

export interface KeyVerificationRequest {
  requesterId: string;
  requesterName: string;
  requesterPublicKey: string;
  requesterFingerprint: string;
  timestamp: number;
}

export interface KeyVerificationResponse {
  responderId: string;
  responderName: string;
  responderPublicKey: string;
  responderFingerprint: string;
  verificationCode: string;
  timestamp: number;
}

export interface VerificationStatus {
  isVerified: boolean;
  verificationMethod: 'fingerprint' | 'out-of-band' | 'trust-on-first-use' | 'none';
  lastVerified: number | null;
  verificationCode?: string;
}

export class KeyVerificationService {
  private static instance: KeyVerificationService;
  private verificationRequests: Map<string, KeyVerificationRequest> = new Map();
  private verificationResponses: Map<string, KeyVerificationResponse> = new Map();
  private verifiedKeys: Map<string, VerificationStatus> = new Map();

  private constructor() {}

  static getInstance(): KeyVerificationService {
    if (!KeyVerificationService.instance) {
      KeyVerificationService.instance = new KeyVerificationService();
    }
    return KeyVerificationService.instance;
  }

  /**
   * Create a key verification request
   */
  createVerificationRequest(
    requesterId: string,
    requesterName: string,
    keyPair: KeyPair
  ): KeyVerificationRequest {
    const request: KeyVerificationRequest = {
      requesterId,
      requesterName,
      requesterPublicKey: keyPair.publicKey,
      requesterFingerprint: keyPair.fingerprint,
      timestamp: Date.now()
    };

    this.verificationRequests.set(requesterId, request);
    return request;
  }

  /**
   * Create a key verification response
   */
  createVerificationResponse(
    responderId: string,
    responderName: string,
    keyPair: KeyPair,
    request: KeyVerificationRequest
  ): KeyVerificationResponse {
    // Generate a verification code for out-of-band verification
    const verificationCode = this.generateVerificationCode();

    const response: KeyVerificationResponse = {
      responderId,
      responderName,
      responderPublicKey: keyPair.publicKey,
      responderFingerprint: keyPair.fingerprint,
      verificationCode,
      timestamp: Date.now()
    };

    this.verificationResponses.set(responderId, response);
    return response;
  }

  /**
   * Verify a key fingerprint
   */
  verifyKeyFingerprint(publicKey: string, expectedFingerprint: string): boolean {
    return E2EEncryption.verifyKeyFingerprint(publicKey, expectedFingerprint);
  }

  /**
   * Verify keys using out-of-band verification code
   */
  verifyWithCode(
    userId1: string,
    userId2: string,
    verificationCode: string
  ): boolean {
    const response1 = this.verificationResponses.get(userId1);
    const response2 = this.verificationResponses.get(userId2);

    if (!response1 || !response2) {
      return false;
    }

    // Check if verification codes match
    if (response1.verificationCode === verificationCode || 
        response2.verificationCode === verificationCode) {
      
      // Mark both keys as verified
      this.verifiedKeys.set(userId1, {
        isVerified: true,
        verificationMethod: 'out-of-band',
        lastVerified: Date.now(),
        verificationCode
      });

      this.verifiedKeys.set(userId2, {
        isVerified: true,
        verificationMethod: 'out-of-band',
        lastVerified: Date.now(),
        verificationCode
      });

      return true;
    }

    return false;
  }

  /**
   * Trust on first use (TOFU) verification
   */
  trustOnFirstUse(userId: string, publicKey: string): boolean {
    const fingerprint = E2EEncryption.generateKeyFingerprint(publicKey);
    
    this.verifiedKeys.set(userId, {
      isVerified: true,
      verificationMethod: 'trust-on-first-use',
      lastVerified: Date.now()
    });

    console.log(`🔐 Trusted key on first use for ${userId}: ${fingerprint}`);
    return true;
  }

  /**
   * Get verification status for a user
   */
  getVerificationStatus(userId: string): VerificationStatus | null {
    return this.verifiedKeys.get(userId) || null;
  }

  /**
   * Check if a user's key is verified
   */
  isKeyVerified(userId: string): boolean {
    const status = this.verifiedKeys.get(userId);
    return status?.isVerified || false;
  }

  /**
   * Get verification request for a user
   */
  getVerificationRequest(userId: string): KeyVerificationRequest | null {
    return this.verificationRequests.get(userId) || null;
  }

  /**
   * Get verification response for a user
   */
  getVerificationResponse(userId: string): KeyVerificationResponse | null {
    return this.verificationResponses.get(userId) || null;
  }

  /**
   * Generate a verification code for out-of-band verification
   */
  private generateVerificationCode(): string {
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Clear verification data for a user
   */
  clearVerificationData(userId: string): void {
    this.verificationRequests.delete(userId);
    this.verificationResponses.delete(userId);
    this.verifiedKeys.delete(userId);
  }

  /**
   * Get all verification requests
   */
  getAllVerificationRequests(): KeyVerificationRequest[] {
    return Array.from(this.verificationRequests.values());
  }

  /**
   * Get all verification responses
   */
  getAllVerificationResponses(): KeyVerificationResponse[] {
    return Array.from(this.verificationResponses.values());
  }

  /**
   * Get all verified keys
   */
  getAllVerifiedKeys(): Map<string, VerificationStatus> {
    return new Map(this.verifiedKeys);
  }
} 