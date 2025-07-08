# 🛠️ Siphera Product Timeline

A modern, WebRTC-first, end-to-end encrypted UCaaS platform.

⸻

## 🚀 Phase 0: Foundation (Month 0–1)

**Goal:** Lay the infrastructure and cryptographic groundwork.
- Finalize architecture, stack, and feature scope
- Register domains and create brand assets
- Deploy AWS infrastructure (IAM, Cognito, S3, Lambda)
- Set up TURN/STUN (coturn or Twilio ICE)
- Build WebSocket signaling server (Node.js or Go)
- Choose E2EE approach (WebRTC + Signal Protocol)
- Scaffold React + React Native apps

⸻

## 🎯 Phase 1: MVP Launch (Months 2–4)

**Goal:** Deliver 1:1 encrypted voice, video, and messaging.
- Secure auth (JWT-based via Cognito/Auth0)
- Encrypted 1:1 voice & video using WebRTC (DTLS/SRTP)
- Encrypted 1:1 chat using Signal Protocol
- Push notifications (SNS/Firebase)
- File upload to S3 (with lifecycle policies)
- Basic React web app
- Basic React Native mobile app
- Internal alpha testing & bug fixes

⸻

## 🌱 Phase 2: Teams & Enterprise Beta (Months 5–8)

**Goal:** Enable secure collaboration at scale.
- Org and user provisioning (multi-tenant)
- Group chat and mentions
- Threaded messaging
- Group voice/video (via LiveKit or Mediasoup)
- Admin Portal v1 (user roles, org config)
- MFA and device management
- Offline messaging & retry queue
- Closed beta with pilot customers

⸻

## 🏛️ Phase 3: Enterprise UCaaS (Months 9–12)

**Goal:** Full enterprise compliance, scalability, and launch.
- SIP gateway integration for E911 (Twilio/Kamailio)
- E911 dispatch logic (location mapping, alerts)
- Call recording + transcription (S3 + Transcribe)
- Admin Portal v2 (RBAC, logs, billing)
- SCIM + SSO (SAML, OIDC)
- Stripe billing integration
- Calendar integrations (Google, Outlook)
- Public launch + investor/pitch deck

⸻

## 📅 Milestone Summary

| Month | Deliverable |
|-------|-------------|
| 1 | Infra, auth, E2EE core |
| 3 | MVP: 1:1 voice/video/chat |
| 5 | Beta: group features, admin panel |
| 8 | Enterprise controls, E911 integration |
| 12 | Public launch, full platform readiness |

⸻

This file is part of the core documentation for the Siphera GitHub repository. Stay lean, build secure, and scale smart.
