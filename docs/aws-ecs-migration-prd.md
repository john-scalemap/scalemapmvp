# ScaleMap AWS ECS Fargate Migration - Brownfield Enhancement PRD

**Date:** 2025-09-23
**Version:** 2.0
**Status:** Ready for Implementation

---

## 1. Intro Project Analysis and Context

### Analysis Source
- ✅ **Stories 6.1-6.5 COMPLETED** (Authentication, Storage, Database migrations done)
- **Three architecture documents analyzed:**
  1. `docs/aws-migration-architecture.md` (v1.0 - Initial Elastic Beanstalk plan)
  2. `docs/architecture.md` (v2.0 - **CURRENT: ECS Fargate plan**)
  3. `docs/prd.md` (v1.0 - Original Epic 6 migration stories)

### Current Project State - Migration Status

**✅ COMPLETED (Stories 6.1-6.5):**
- ✅ **Authentication**: Replit → AWS Cognito (implemented in `server/cognitoAuth.ts`)
- ✅ **Storage**: GCS → AWS S3 (implemented in `server/s3Storage.ts`)
- ✅ **Database Client**: Neon serverless → Standard PostgreSQL with RDS support (`server/db.ts`)
- ✅ **Code Dependencies**: Removed Replit-specific code, added AWS SDK packages
- ✅ **Infrastructure Audit**: Pre-migration assessment completed

**❌ DEPLOYMENT BLOCKED:**
- ⚠️ **Original Plan (Elastic Beanstalk)** - Could not deploy successfully
- 🔄 **NEW PLAN (ECS Fargate)** - Architecture v2.0 with event-driven microservices

**📋 REMAINING WORK (Current Architecture v2.0 Focus):**
- **Container orchestration**: ECS Fargate setup for API + Agent Workers
- **Event infrastructure**: EventBridge, SQS FIFO queues for agent coordination
- **Workflow orchestration**: Step Functions for 72-hour delivery pipeline
- **Infrastructure as Code**: AWS CDK implementation for all services
- **Deployment pipeline**: GitHub Actions CI/CD for ECS Fargate

### Architecture Evolution: v1.0 → v2.0

**v1.0 (Attempted, Failed Deployment):**
- Elastic Beanstalk monolith hosting
- Simple lift-and-shift approach
- Deployment blocked due to infrastructure constraints

**v2.0 (Current Target - NEW):**
- **ECS Fargate** - Containerized microservices (API + 12 Agent Workers)
- **EventBridge + SQS** - Event-driven agent triage and coordination
- **Step Functions** - 72-hour delivery orchestration
- **AWS CDK** - Infrastructure as Code for reproducible deployments
- **Cost-optimized**: Intelligent agent activation (3-5 of 12 agents) reduces API costs 50-60%

### Enhancement Scope Definition

**Enhancement Type:**
- ☑️ **Infrastructure Architecture Upgrade** (EB → ECS Fargate)
- ☑️ **Event-Driven Microservices Implementation** (NEW)
- ☑️ **Container Orchestration** (Fargate, NOT EC2)
- ☑️ **Workflow Automation** (Step Functions for delivery pipeline)

**Enhancement Description:**
Complete the AWS migration by deploying the existing Cognito/S3/RDS-integrated codebase to **ECS Fargate** with event-driven architecture. Replace the failed Elastic Beanstalk approach with containerized microservices: API service (always-on) + conditional Agent Workers (3-5 of 12 activated per assessment). Implement EventBridge for domain triage events, SQS FIFO queues for agent task distribution, and Step Functions for automated 24/48/72-hour staged delivery—all while protecting the working Express/React codebase.

**Impact Assessment:**
- ☑️ **Moderate-to-Significant Impact** - Infrastructure deployment strategy change
  - ✅ Application code largely complete (auth, storage, DB done)
  - 🆕 Container packaging (Dockerfile for API + Agents)
  - 🆕 Event infrastructure (EventBridge, SQS, Step Functions)
  - 🆕 ECS Fargate service definitions and task orchestration
  - 🆕 AWS CDK infrastructure code (~85% new infrastructure, ~15% code changes)

### Goals and Background Context

**Goals:**
- Successfully deploy to production AWS using **ECS Fargate** (not Elastic Beanstalk)
- Implement event-driven agent orchestration reducing OpenAI API costs 50-60%
- Establish 72-hour delivery automation with Step Functions state machine
- Stay within AWS Free Tier + $120 credits budget ($45-68/month estimated)
- Enable 10+ concurrent assessments with container auto-scaling
- Create reproducible infrastructure via AWS CDK for team scalability

**Background Context:**

ScaleMap has successfully completed authentication (Cognito), storage (S3), and database (RDS) migrations but **failed to deploy using the original Elastic Beanstalk architecture** documented in aws-migration-architecture.md v1.0.

The **new architecture (v2.0)** pivots to **ECS Fargate** with event-driven microservices to solve both the deployment challenges and operational scalability requirements. This approach containerizes the existing Express API as an always-on Fargate service while deploying the 12 domain specialist agents as on-demand Fargate tasks activated only when triage identifies critical domains (3-5 of 12 per assessment).

EventBridge orchestrates domain triage events, SQS FIFO queues distribute agent tasks for ordered processing, and Step Functions manages the complex 24/48/72-hour staged delivery workflow with automatic retries and client validation integration. The entire infrastructure will be defined in AWS CDK (TypeScript) for version-controlled, reproducible deployments—addressing the deployment blockers from the v1.0 attempt while establishing production-ready architecture.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-23 | 2.0 | ECS Fargate Migration PRD | John (PM Agent) |
| 2025-09-22 | 1.0 | Initial EB Migration Architecture | Winston (Architect) |

---

## 2. Requirements

### Functional Requirements

**FR1:** The containerized Express API must deploy to ECS Fargate and serve all existing endpoints (authentication, assessment creation, questionnaire submission, document uploads) with 100% feature parity to the current Cognito/S3/RDS-integrated codebase.

**FR2:** The ECS Fargate API service must successfully connect to AWS RDS PostgreSQL through VPC security groups and maintain all existing database operations via the standard `pg` client with SSL configuration.

**FR3:** Document upload functionality must work seamlessly with AWS S3 from the containerized ECS environment, generating presigned URLs and maintaining ACL permission models without regression.

**FR4:** AWS Cognito authentication must function correctly in the ECS Fargate environment, validating JWT tokens and maintaining user sessions through the PostgreSQL session store.

**FR5:** The assessment submission endpoint must publish EventBridge events containing assessment metadata for downstream agent orchestration (implemented in Phase 2).

**FR6:** Domain Triage Agent must be deployable as a standalone ECS Fargate task, triggered by EventBridge rules, analyzing assessment data to identify 3-5 critical domains requiring specialist analysis.

**FR7:** The system must deploy 12 specialist domain agent workers as on-demand ECS Fargate tasks, consuming SQS FIFO messages and executing domain-specific analysis when activated by triage results.

**FR8:** SQS FIFO queues must ensure ordered, exactly-once delivery of agent task messages with deduplication to prevent duplicate domain analysis.

**FR9:** Step Functions state machine must orchestrate the 24/48/72-hour delivery pipeline, coordinating agent completion signals, report synthesis, and email delivery via Amazon SES.

**FR10:** The deployment infrastructure must be defined in AWS CDK (TypeScript) with modular stacks for networking, compute, events, and workflows to enable reproducible deployments and environment promotion.

**FR11:** The system must support separate Docker images for API service (always-on) and agent workers (on-demand), with appropriate task definitions and resource allocations (API: 1 vCPU/2GB, Agents: 0.5 vCPU/1GB).

**FR12:** ECS auto-scaling policies must limit agent worker tasks to maximum 5 concurrent executions to prevent cost overruns while supporting 10+ concurrent assessments through intelligent queuing.

**FR13:** All AWS credentials, API keys (OpenAI, Stripe), and database passwords must be managed through AWS Secrets Manager, injected into ECS task definitions at runtime without hardcoding.

**FR14:** CloudWatch Logs must capture structured application logs from all ECS tasks with 30-day retention for production and 7-day for staging, enabling debugging without excessive storage costs.

**FR15:** The React frontend must be deployed to S3 with CloudFront CDN distribution, maintaining communication with the ECS Fargate API through ALB endpoints.

### Non-Functional Requirements

**NFR1:** ECS Fargate deployment must maintain the existing 72-hour delivery SLA with 95% reliability through proper Step Functions error handling and automatic retry logic.

**NFR2:** API response times must remain under 3 seconds for all user-facing endpoints when running in containerized ECS Fargate environment (same as current performance).

**NFR3:** Total monthly AWS costs must stay within $45-68 range during Free Tier period (months 1-12) and not exceed $80/month post-Free Tier, accounting for ECS Fargate ($25-35), ALB ($16), and orchestration services ($5-10).

**NFR4:** Docker images must be optimized for size (<500MB for API, <300MB for agents) using multi-stage builds and alpine base images to minimize ECR storage costs and deployment times.

**NFR5:** Database connection pooling from ECS tasks must not exceed RDS PostgreSQL max_connections limit (100 for db.t3.micro) under peak load of 10 concurrent assessments.

**NFR6:** The system must achieve 99.5% uptime during Phase 1 deployment (API-only) and maintain this through Phase 2 orchestration layer addition without service interruption.

**NFR7:** AWS CDK deployments must complete within 15 minutes for infrastructure updates and support atomic rollback to previous stack version in case of deployment failures.

**NFR8:** EventBridge event publishing must have <100ms latency overhead on assessment submission endpoint to maintain user experience during orchestration layer integration.

**NFR9:** SQS message processing by agent workers must begin within 30 seconds of triage completion to meet 24-hour executive summary delivery deadline.

**NFR10:** Step Functions state machine executions must handle agent task failures gracefully with exponential backoff retries (1s, 2s, 4s) before escalating to founder notification.

**NFR11:** All ECS task definitions must specify resource limits (CPU, memory) to prevent resource contention and enable accurate cost prediction for scaling scenarios.

**NFR12:** CloudWatch billing alerts must trigger at $10, $20, $50, and $100 thresholds with SNS notifications to prevent budget overruns during initial deployment phase.

### Compatibility Requirements

**CR1: Existing API Compatibility** - All HTTP endpoints, request/response formats, and business logic must remain unchanged during containerization; only infrastructure layer (hosting platform) changes from Replit to ECS Fargate.

**CR2: Database Schema Compatibility** - Zero database schema changes required; existing Drizzle ORM migrations and table structures work identically with AWS RDS PostgreSQL as with previous Neon database.

**CR3: Authentication Flow Compatibility** - AWS Cognito integration (completed in Story 6.4) must continue working without modification; JWT validation, session management, and user profile operations remain intact.

**CR4: Storage Integration Compatibility** - AWS S3 implementation (completed in Story 6.5) must maintain identical file upload/download interfaces; presigned URL generation and ACL models work without frontend changes.

**CR5: Frontend Integration Compatibility** - React client code requires zero changes for ECS Fargate API communication; API endpoints remain accessible through ALB with CORS policies preserved.

**CR6: External Service Compatibility** - OpenAI API, Stripe payment integration, and Amazon SES email delivery must function identically from ECS Fargate environment without connection or authentication changes.

**CR7: Development Workflow Compatibility** - Local development environment using Docker Compose must mirror production ECS Fargate setup for testing; developers can validate changes before CDK deployment.

---

## 3. Technical Constraints and Integration Requirements

### Existing Technology Stack

**From Architecture v2.0 and Completed Migration Work:**

**Languages**: TypeScript 5.6.3, Node.js 20.x LTS

**Backend Framework**: Express 4.21.2 (existing monolith API)

**Frontend Framework**: React 18.3.1 with Vite 5.4.20 bundler

**Database**:
- ✅ **Completed**: AWS RDS PostgreSQL 16.x with standard `pg` client
- ✅ **Removed**: `@neondatabase/serverless` dependency
- Connection pooling via Drizzle ORM 0.39.1

**Authentication**:
- ✅ **Completed**: AWS Cognito User Pool integration (`server/cognitoAuth.ts`)
- ✅ **Removed**: Replit OpenID (`openid-client` dependency removed)

**Storage**:
- ✅ **Completed**: AWS S3 with SDK v3 (`@aws-sdk/client-s3`, `server/s3Storage.ts`)
- ✅ **Removed**: Google Cloud Storage (`@google-cloud/storage` dependency removed)

**Infrastructure (NEW - To Be Implemented):**
- AWS ECS Fargate (container orchestration)
- AWS EventBridge (event bus for agent triage)
- AWS SQS FIFO (agent task queues)
- AWS Step Functions (72-hour delivery state machine)
- AWS CDK 2.x TypeScript (Infrastructure as Code)
- Amazon SES (email delivery)
- AWS CloudFront + S3 (static asset CDN)
- Application Load Balancer (traffic distribution)

**External Dependencies**:
- OpenAI API (GPT-4 for agent intelligence) - **No changes needed**
- Stripe API 18.5.0 (payment processing) - **No changes needed**

**Container Runtime**: Docker 24.x with multi-stage builds (Node.js 20-alpine base images)

### Integration Approach

**Database Integration Strategy**:
- ✅ **Already Complete**: RDS PostgreSQL connection via standard `pg` Pool with SSL enabled for production
- Connection string: `postgresql://user:pass@rds-endpoint:5432/scalemap?ssl=true`
- Drizzle ORM migrations run via `npm run db:push` during deployment pipeline
- ECS task must have security group access to RDS in private subnet
- Connection pooling configuration: max 10 connections per ECS task (10 tasks × 10 = 100 max for db.t3.micro)

**API Integration Strategy**:
- Express API containerized as single ECS Fargate service (Phase 1)
- Application Load Balancer (ALB) routes HTTPS traffic to ECS tasks
- Health check endpoint: `GET /api/health` with 30-second interval
- Environment variables injected from AWS Secrets Manager at task startup
- Auto-scaling: Min 1 task (always-on), Max 3 tasks based on CPU/memory utilization

**Frontend Integration Strategy**:
- React app built via `npm run build` → static files to S3 bucket
- CloudFront distribution serves S3 content with custom domain
- API calls route to ALB endpoint: `https://api.scalemap.com` (or ALB DNS)
- CORS configuration in Express must allow CloudFront origin
- No code changes - existing `client/src/lib/api.ts` works with new backend URL

**Testing Integration Strategy**:
- Local development: Docker Compose mimics ECS Fargate environment (API + PostgreSQL + LocalStack for AWS services)
- Integration tests use Testcontainers for PostgreSQL (same as current)
- E2E tests (Puppeteer) run against staging ECS deployment before production
- Jest unit tests remain unchanged - testing business logic, not infrastructure

### Code Organization and Standards

**File Structure Approach**:
- **Preserve existing monorepo**: `/server` (API), `/client` (React), `/shared` (common types)
- **New additions**:
  - `/server/Dockerfile` - Multi-stage build for API container
  - `/server/agents/workers/` - Extracted agent logic for separate containers (Phase 2)
  - `/infrastructure/` - AWS CDK stacks (TypeScript)
  - `/.github/workflows/deploy-ecs.yml` - CI/CD pipeline
  - `/docker-compose.yml` - Local development environment

**Agent Worker Separation (Phase 2)**:
```
server/
├── src/
│   ├── api/           # Express API (Phase 1 container)
│   ├── agents/
│   │   ├── triage/    # Domain triage service (Phase 2 container)
│   │   ├── workers/   # 12 specialist agents (Phase 2 container)
│   │   └── orchestrator/ # SQS consumer logic
│   ├── workflows/     # Step Functions definitions
```

**Naming Conventions**:
- Docker images: `scalemap-api:v1.0`, `scalemap-agent-worker:v1.0`
- ECS services: `scalemap-api-service`, `scalemap-triage-agent-task`
- CDK stacks: `ScaleMapNetworkingStack`, `ScaleMapComputeStack`, `ScaleMapEventsStack`

**Coding Standards**:
- Maintain existing ESLint + Prettier configuration
- TypeScript strict mode enabled (already in `tsconfig.json`)
- Structured logging via Winston (add to API for CloudWatch integration)
- No `console.log` in production code - use logger with correlation IDs

**Documentation Standards**:
- Infrastructure changes documented in `docs/architecture.md` (update to v3.0 post-deployment)
- CDK stack documentation in `/infrastructure/README.md`
- Deployment runbook in `docs/runbooks/ecs-deployment.md`
- Environment variable reference in `.env.example` (updated for ECS)

### Deployment and Operations

**Build Process Integration**:
- **Phase 1 (API)**:
  ```bash
  docker build -t scalemap-api:latest -f server/Dockerfile .
  docker tag scalemap-api:latest <ECR_URI>/scalemap-api:v1.0
  docker push <ECR_URI>/scalemap-api:v1.0
  ```
- **Phase 2 (Agents)**: Separate Dockerfile for agent workers with SQS consumer entrypoint
- GitHub Actions workflow automates: lint → test → build → push to ECR → update ECS service

**Deployment Strategy**:
- **Phase 1**: Blue-green deployment for API service via ECS rolling update
  - Create new task revision with updated container image
  - ALB shifts traffic gradually: 10% → 50% → 100% over 5 minutes
  - Rollback: Shift traffic back to previous task revision (< 2 minutes)

- **Phase 2**: Event-driven agent tasks don't require blue-green (on-demand activation)
  - Update task definition, new tasks use new image automatically
  - In-flight agent tasks complete with old version (graceful completion)

**Monitoring and Logging**:
- **CloudWatch Logs**:
  - Log group per ECS service: `/ecs/scalemap-api`, `/ecs/scalemap-agents`
  - Structured JSON logging with correlation IDs for request tracing
  - Retention: 30 days production, 7 days staging

- **CloudWatch Metrics**:
  - ECS CPU/Memory utilization per service
  - ALB request count, latency (P50, P99), error rate
  - Custom metrics: Assessment processing time, agent activation count

- **CloudWatch Alarms**:
  - API error rate > 5% for 2 minutes → SNS alert
  - ECS task failure → SNS notification
  - Billing > $50 → Email alert

**Configuration Management**:
- **AWS Secrets Manager**:
  - `/scalemap/prod/database-url` - RDS connection string
  - `/scalemap/prod/openai-api-key` - OpenAI API key
  - `/scalemap/prod/stripe-secret-key` - Stripe secret
  - `/scalemap/prod/cognito-config` - User Pool ID, Client ID

- **Environment Variables** (ECS Task Definition):
  - `NODE_ENV=production`
  - `AWS_REGION=eu-west-1`
  - `LOG_LEVEL=info`
  - Secrets injected as environment variables from Secrets Manager

- **CDK Context** (`cdk.json`):
  - Environment-specific configs: `staging.json`, `production.json`
  - VPC CIDR ranges, subnet allocations, resource naming

### Risk Assessment and Mitigation

**From Pre-Mortem Analysis + Known Issues:**

**Technical Risks**:
1. **Container Networking Complexity**
   - Risk: ECS tasks can't reach RDS/S3 due to security group misconfiguration
   - Mitigation: Deploy minimal networking stack first, validate connectivity with bastion host before API deployment
   - Known Issue: VPC requires both public subnets (ALB) and private subnets (ECS tasks, RDS)

2. **Docker Build Failures in CI/CD**
   - Risk: Image builds locally but fails in GitHub Actions with dependency errors
   - Mitigation: Use exact Node.js version match (20-alpine), comprehensive .dockerignore, layer caching in ECR
   - Known Issue: TypeScript compilation in multi-stage build requires `tsconfig.json` and dependencies in correct stage

3. **Database Connection Pool Exhaustion**
   - Risk: ECS auto-scaling creates too many tasks, exceeds RDS max_connections=100
   - Mitigation: Limit max connections per task (10), set ECS max task count (5 API + 5 agents = 100 connections max)
   - Known Issue: Connection pool must close gracefully on ECS task termination

**Integration Risks**:
1. **EventBridge → SQS Message Loss**
   - Risk: Events published but never reach agent workers (IAM permissions, routing rules)
   - Mitigation: Deploy event infrastructure in isolation, use AWS Policy Simulator to validate permissions, test with dummy events
   - Known Issue: EventBridge rule must have exact pattern match for assessment events

2. **Step Functions Workflow Failures**
   - Risk: State machine starts but never completes due to missing agent completion signals
   - Mitigation: Implement Step Functions execution tracing, test state machine with mock agent responses before live deployment
   - Known Issue: Circular wait conditions if agent completion callback is misconfigured

**Deployment Risks**:
1. **CDK Stack Dependency Deadlock**
   - Risk: Circular dependency between ECS service (needs EventBridge) and EventBridge rule (needs ECS service running)
   - Mitigation: Use CDK modular stacks with explicit dependencies: Networking → Compute → Events → Workflows
   - Known Issue: Deploy EventBridge rules AFTER ECS service is running to avoid circular reference

2. **Secrets Management Misconfiguration**
   - Risk: Task definitions reference non-existent secrets, causing task startup failures with cryptic errors
   - Mitigation: Create all Secrets Manager entries before CDK deployment, validate secret ARNs in task definition
   - Known Issue: Secrets must exist in same region as ECS tasks (eu-west-1)

3. **Cost Explosion from Runaway Auto-Scaling**
   - Risk: Agent tasks scale infinitely, exceeding $120 credit budget in days
   - Mitigation: Hard-code max task limits in ECS service (5 agents max), set CloudWatch billing alarms at $10/$20/$50
   - Known Issue: Free Tier 750 hours applies to single EC2 instance equivalent, not Fargate vCPU-hours

**Mitigation Strategies**:
- **Phase 1 Isolation**: Deploy API-only, validate networking/database before adding orchestration
- **Staging Environment**: Full AWS stack in staging account, test complete workflows before production
- **Incremental CDK Deployment**: Deploy stacks in sequence with validation between each
- **Cost Monitoring**: Daily AWS Cost Explorer review during first 2 weeks post-deployment
- **Rollback Procedures**: Document exact steps to revert to previous ECS task definition, CDK stack version

---

## 4. Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single Comprehensive Epic with Phased Story Sequencing**

**Rationale Based on Project Analysis:**

This AWS ECS Fargate deployment is a **cohesive infrastructure migration** that should be managed as a single epic with two distinct phases:

1. **Phase 1 (Stories 1-3)**: API-only deployment to assessment submission boundary - validates infrastructure foundation without orchestration complexity
2. **Phase 2 (Stories 4-7)**: Event-driven orchestration layer - adds EventBridge, agents, Step Functions after foundation is proven

**Why Single Epic:**
- All work serves one goal: Production AWS deployment with ECS Fargate
- Stories are sequentially dependent (can't deploy agents before API infrastructure exists)
- Shared infrastructure components (VPC, CDK stacks, monitoring) span all stories
- Natural checkpoint at Story 3 (Phase 1 complete) allows validation before Phase 2

**Why NOT Multiple Epics:**
- This isn't multiple unrelated features - it's one migration with risk-mitigated phases
- Breaking into separate epics would create artificial boundaries
- Single epic maintains traceability and ensures Phase 2 doesn't start prematurely

**Risk Mitigation Through Story Sequencing:**
- Stories 1-3 deliver working production system (API + database + auth) before orchestration
- Each story includes rollback procedures and integration verification
- Phase boundary (between Story 3 and 4) is explicit decision gate
- Stories minimize blast radius - infrastructure changes isolated from application logic changes

---

## 5. Epic 1: AWS ECS Fargate Production Deployment

**Epic Goal**: Deploy ScaleMap to production AWS infrastructure using ECS Fargate with event-driven agent orchestration, migrating from failed Elastic Beanstalk approach to containerized microservices architecture while maintaining 100% feature parity, zero data loss, and staying within $45-68/month Free Tier budget.

**Integration Requirements**:
- Preserve completed Cognito/S3/RDS integrations from Stories 6.1-6.5
- Containerize existing Express API without code changes (infrastructure-only migration)
- Implement phased deployment: API-only foundation (Phase 1) → Event orchestration (Phase 2)
- Establish AWS CDK infrastructure as code for reproducible deployments
- Enable 72-hour delivery SLA through Step Functions orchestration of agent workers

---

### Story 1.1: AWS Infrastructure Foundation & Networking Setup

**As a** DevOps engineer,
**I want** to provision AWS networking infrastructure and foundational services via CDK,
**so that** ECS Fargate, RDS, and other services have secure VPC connectivity before application deployment.

**Acceptance Criteria:**

1. AWS CDK project initialized in `/infrastructure` directory with TypeScript configuration and modular stack architecture
2. Networking stack deployed with VPC (CIDR: 10.0.0.0/16), public subnets (2 AZs for ALB), private subnets (2 AZs for ECS/RDS)
3. Security groups configured: ALB (port 80/443 from internet), ECS (port 3000 from ALB), RDS (port 5432 from ECS only)
4. Internet Gateway attached to VPC with route tables directing public subnet traffic to IGW and private subnet traffic to NAT Gateway
5. AWS Secrets Manager secrets created for production: `/scalemap/prod/database-url`, `/scalemap/prod/openai-api-key`, `/scalemap/prod/stripe-secret-key`, `/scalemap/prod/cognito-config`
6. CloudWatch Log groups created: `/ecs/scalemap-api` (30-day retention), `/ecs/scalemap-agents` (30-day retention)
7. Billing alerts configured via CloudWatch Alarms at $10, $20, $50, $100 thresholds with SNS email notifications

**Integration Verification:**

**IV1: Network Connectivity Verification** - Deploy temporary EC2 bastion host in public subnet, validate SSH access and connectivity to RDS endpoint in private subnet (confirms security group rules and routing)

**IV2: Secrets Access Validation** - Use AWS CLI from bastion to retrieve secrets from Secrets Manager, confirm all required secrets exist and are readable with correct IAM permissions

**IV3: Cost Baseline Verification** - Confirm AWS Cost Explorer shows $0 charges for Free Tier services (VPC, security groups), NAT Gateway cost calculated (~$32/month) and accepted within budget

---

### Story 1.2: RDS PostgreSQL Production Deployment & Data Migration

**As a** database administrator,
**I want** to deploy production RDS PostgreSQL instance and migrate data from development/staging,
**so that** the ECS Fargate API has a production database ready with existing assessment data preserved.

**Acceptance Criteria:**

1. RDS PostgreSQL 16.x instance created via CDK in private subnets with Multi-AZ disabled (Free Tier: db.t3.micro, 20GB storage)
2. Database security group allows inbound port 5432 only from ECS security group, denies all other traffic
3. Automated backups enabled (7-day retention), maintenance window set to Sunday 3-5 AM UTC
4. Database connection string stored in AWS Secrets Manager at `/scalemap/prod/database-url` with format: `postgresql://username:password@rds-endpoint:5432/scalemap?ssl=true`
5. Drizzle ORM migrations executed against production RDS: `DATABASE_URL=<secrets-value> npm run db:push` completes successfully
6. Data export from staging/development RDS completed using `pg_dump`, import to production RDS verified with row count validation across all tables (users, assessments, documents, agent_analyses)
7. SSL/TLS connection validated: Test connection from bastion host using `psql` with `?ssl=true` parameter confirms encrypted connection

**Integration Verification:**

**IV1: Schema Integrity Verification** - Compare production RDS schema with staging using `pg_dump --schema-only`, confirm zero differences in table structures, indexes, constraints

**IV2: Data Migration Validation** - Execute data integrity checks: row counts match across all tables, foreign key relationships intact, no NULL violations in NOT NULL columns

**IV3: Connection Pool Testing** - Simulate 10 concurrent connections from bastion host, verify RDS accepts all connections within max_connections limit and performance remains stable

---

### Story 1.3: API Container Build & ECS Fargate Deployment (Phase 1 Complete)

**As a** ScaleMap user,
**I want** the Express API running on ECS Fargate with ALB routing,
**so that** I can register, login, complete assessments, upload documents, and submit without any service interruption.

**Acceptance Criteria:**

1. Multi-stage Dockerfile created in `/server/Dockerfile` using Node.js 20-alpine base image with TypeScript compilation in build stage and production dependencies in runtime stage (<500MB final image)
2. `.dockerignore` configured to exclude `node_modules`, `.git`, `*.test.ts`, `.env` files, reducing image build context size
3. ECR repository created via CDK, Docker image built locally and pushed to ECR with tag `scalemap-api:v1.0`
4. ECS cluster created (`scalemap-cluster`), Fargate task definition configured: 1 vCPU, 2GB RAM, secrets injected from Secrets Manager as environment variables
5. ECS service deployed with ALB target group, health check endpoint `GET /api/health` responding 200 OK, minimum 1 task running
6. Application Load Balancer created in public subnets, listener on port 443 with SSL certificate (ACM), forwarding to ECS target group on port 3000
7. React frontend built (`npm run build` in `/client`), deployed to S3 bucket with CloudFront distribution, API calls routed to ALB endpoint

**Integration Verification:**

**IV1: End-to-End User Flow Verification** - Complete full user journey in production: register new user via Cognito → login → complete 12-domain assessment questionnaire → upload 3 test documents to S3 → submit assessment successfully (stored in RDS)

**IV2: Authentication & Session Verification** - Validate Cognito JWT token flow: login returns valid token, protected API endpoints reject requests without token, session persists in PostgreSQL session store across multiple requests

**IV3: Performance & Monitoring Verification** - Confirm API response times <3 seconds for all endpoints, CloudWatch Logs capture structured JSON logs with correlation IDs, CloudWatch Metrics show ECS CPU <50% under test load

---

**🎯 PHASE 1 CHECKPOINT: Assessment Submission Boundary Validated**

At this point, you have a **fully functional production system** that allows users to:
- ✅ Register and authenticate (Cognito)
- ✅ Complete assessment questionnaires (Express API → RDS)
- ✅ Upload documents (S3 integration)
- ✅ Submit assessments (data stored in RDS)

**Decision Gate**: Validate Phase 1 success before proceeding to Phase 2:
- Zero data loss confirmed
- All existing features work identically to pre-migration
- Cost tracking shows within budget
- No critical issues in CloudWatch Logs

**Only after approval, proceed with orchestration layer (Stories 1.4-1.7)**

---

### Story 1.4: EventBridge & SQS Infrastructure for Agent Orchestration

**As a** system architect,
**I want** EventBridge event bus and SQS FIFO queues deployed for agent coordination,
**so that** assessment submissions can trigger domain triage and specialist agent processing.

**Acceptance Criteria:**

1. EventBridge custom event bus created (`scalemap-events`) via CDK with CloudWatch Logs archive for event replay capability
2. Assessment submission endpoint updated to publish `AssessmentSubmitted` event to EventBridge with payload: `{assessmentId, userId, submittedAt, industry}`
3. SQS FIFO queue created (`scalemap-agent-tasks.fifo`) with message deduplication enabled, visibility timeout 900 seconds (15 min for agent processing)
4. EventBridge rule created: pattern matches `AssessmentSubmitted` events, routes to SQS FIFO queue as target
5. Dead-letter queue (DLQ) configured for SQS with max receive count 3, alerts SNS topic when messages land in DLQ
6. IAM roles configured: EventBridge has `sqs:SendMessage` permission to agent queue, future ECS agent tasks have `sqs:ReceiveMessage`, `sqs:DeleteMessage` permissions
7. Test event publishing: Manual `AssessmentSubmitted` event sent via AWS CLI, confirmed arrival in SQS queue with correct message attributes

**Integration Verification:**

**IV1: Event Flow Verification** - Submit test assessment via API, confirm EventBridge event published within 100ms, SQS queue receives message with correct deduplication ID and FIFO ordering

**IV2: Queue Processing Verification** - Manually consume SQS message using AWS CLI, validate message payload contains all required assessment metadata, message deleted from queue successfully after processing

**IV3: Error Handling Verification** - Publish malformed event to EventBridge, confirm EventBridge rule filters invalid events, DLQ remains empty (no failed messages), CloudWatch Logs show event rejection reason

---

### Story 1.5: Domain Triage Agent Deployment (First Agent Worker)

**As a** ScaleMap system,
**I need** domain triage agent running as ECS Fargate task to analyze assessments,
**so that** I can identify 3-5 critical domains requiring specialist analysis instead of activating all 12 agents.

**Acceptance Criteria:**

1. Triage agent code extracted from `/server/src/agents/triage` into standalone entry point (`triageWorker.ts`) with SQS message consumer loop
2. Separate Dockerfile created for agent worker (`server/agents/Dockerfile`) using Node.js 20-alpine, image size <300MB, pushed to ECR as `scalemap-triage-agent:v1.0`
3. ECS Fargate task definition created for triage agent: 0.5 vCPU, 1GB RAM, environment variables from Secrets Manager (OpenAI API key, DATABASE_URL)
4. EventBridge rule updated to trigger triage agent ECS task directly (not via SQS) on `AssessmentSubmitted` event using ECS Run Task API
5. Triage agent logic: reads assessment data from RDS, calls OpenAI GPT-4 with domain severity analysis prompt, writes `triageResults` JSON to `assessments` table
6. Triage completion publishes `DomainTriageComplete` event to EventBridge with payload: `{assessmentId, activatedDomains: ['financial', 'revenue', 'tech'], triageConfidence: 0.85}`
7. CloudWatch Logs capture triage agent execution: assessment analysis duration, OpenAI token usage, identified domains

**Integration Verification:**

**IV1: Triage Agent Activation Verification** - Submit test assessment, confirm EventBridge triggers ECS Run Task API, triage agent task reaches RUNNING state within 30 seconds, completes analysis within 2 minutes

**IV2: Domain Identification Verification** - Validate triage agent correctly identifies 3-5 critical domains based on assessment responses, writes `triageResults` to RDS with confidence scores, publishes `DomainTriageComplete` event

**IV3: Cost & Performance Verification** - Confirm triage agent task auto-terminates after completion (no long-running costs), OpenAI API usage ~5K tokens per triage (within budget), CloudWatch shows triage latency <2 minutes

---

### Story 1.6: Specialist Agent Workers & SQS Processing

**As a** ScaleMap assessment,
**I want** specialist domain agents (12 agents) deployed as on-demand ECS tasks,
**so that** only the 3-5 critical domains identified by triage receive deep analysis.

**Acceptance Criteria:**

1. Specialist agent worker code consolidated in `/server/src/agents/workers/agentWorker.ts` with dynamic agent ID selection from SQS message attribute
2. Single Docker image for all 12 specialist agents (`scalemap-agent-worker:v1.0`) with agent-specific prompts loaded from RDS `agent_prompts` table at runtime
3. ECS Fargate task definition for agent workers: 0.5 vCPU, 1GB RAM, auto-scaling policy (min 0, max 5 tasks based on SQS queue depth)
4. EventBridge rule on `DomainTriageComplete`: For each activated domain in `triageResults`, send SQS message to `scalemap-agent-tasks.fifo` with attributes: `{assessmentId, agentId: 'financial', domainId: 'financial_mgmt'}`
5. Agent worker SQS consumer: Polls queue, receives message, executes domain analysis via OpenAI API, writes `AgentAnalysis` record to RDS with findings/recommendations
6. Agent completion signals Step Functions (via callback token in SQS message) or updates RDS status field for orchestration tracking
7. Auto-scaling triggers ECS task launch when SQS `ApproximateNumberOfMessagesVisible` > 2, scales down to 0 when queue empty for 5 minutes

**Integration Verification:**

**IV1: Conditional Agent Activation Verification** - Submit assessment triggering triage identifying 3 domains (financial, revenue, tech), confirm exactly 3 SQS messages sent, exactly 3 agent worker tasks launched (not all 12)

**IV2: Agent Analysis Quality Verification** - Validate agent workers retrieve correct agent prompts from RDS, execute OpenAI analysis with domain-specific expertise, write structured `AgentAnalysis` records with health scores and recommendations

**IV3: Concurrency & Scaling Verification** - Submit 3 assessments simultaneously (9 total domains activated), confirm ECS scales to max 5 agent tasks, remaining tasks queue in SQS, all agents complete within 15 minutes, scale down to 0 after completion

---

### Story 1.7: Step Functions 72-Hour Delivery Orchestration

**As a** ScaleMap client,
**I want** automated staged delivery of assessment results (24hr/48hr/72hr),
**so that** I receive executive summary, detailed report, and implementation kits on schedule without manual founder intervention.

**Acceptance Criteria:**

1. Step Functions state machine created via CDK (`ScaleMapDeliveryPipeline`) with stages: 24hr summary generation → 48hr detailed report with validation → 72hr implementation kits
2. State machine triggered by `DomainTriageComplete` EventBridge event, receives input: `{assessmentId, activatedDomains, executionStartTime}`
3. **24-hour stage**: Wait state (24 hours from submission) → Lambda function generates executive summary from `triageResults`, stores in S3, sends email via SES
4. **48-hour stage**: Wait for all agent analyses completion (poll RDS for `AgentAnalysis` count matching activated domains) → Lambda synthesizes detailed report with heatmaps → Sends email with validation request
5. **72-hour stage**: Wait for client validation (EventBridge `ValidationReceived` event or 24hr timeout) → Lambda generates customized implementation kits based on feedback → Final SES email delivery
6. Error handling: Exponential backoff retries (1s, 2s, 4s) for transient failures, SNS alert to founder if critical step fails after 3 retries, circuit breaker on OpenAI API calls
7. Step Functions execution tracking: CloudWatch dashboard shows pipeline status, average completion time, success rate, SLA compliance (72-hour deadline)

**Integration Verification:**

**IV1: End-to-End Pipeline Verification** - Submit test assessment, confirm Step Functions execution starts immediately after triage completion, 24hr summary delivered on schedule (email sent via SES with S3 download link)

**IV2: Validation Loop Verification** - At 48-hour mark, client receives detailed report email with validation link, submits priority confirmation, Step Functions resumes execution and customizes 72hr implementation kits based on feedback

**IV3: SLA Compliance Verification** - Validate complete workflow completes within 72 hours from submission, CloudWatch metrics show delivery stages hitting targets (24hr ±1hr, 48hr ±2hr, 72hr exact), no SLA breaches in test runs

---

## Epic Definition of Done

- ✅ All 7 stories completed with acceptance criteria met
- ✅ Phase 1 (Stories 1-3) validated: Users can submit assessments in production
- ✅ Phase 2 (Stories 4-7) validated: Full 72-hour delivery pipeline operational
- ✅ Zero data loss confirmed: All staging data migrated to production RDS
- ✅ Cost validation: Monthly spend within $45-68 budget (Free Tier + credits)
- ✅ Performance targets met: API <3 seconds, agent processing <15 minutes, delivery SLA 72 hours
- ✅ Monitoring operational: CloudWatch dashboards, alarms, logs all functional
- ✅ Rollback procedures documented and tested for each story
- ✅ No regression in existing features: Cognito auth, S3 uploads, Stripe payments all working

---

## Next Steps

### Immediate Actions
1. **Review and approve this PRD** with technical team
2. **Set up AWS account** if not already configured (verify $120 credits)
3. **Initialize CDK project** in `/infrastructure` directory
4. **Create GitHub project board** for story tracking

### Story Manager Handoff

**Story Manager - Please develop detailed implementation tasks for Epic 1:**

"This is an infrastructure deployment enhancement to an existing ScaleMap system running TypeScript/Express/React. Key considerations:

- **Completed work (Stories 6.1-6.5)**: Cognito auth, S3 storage, RDS database client already implemented
- **Integration points**: ECS must connect to existing RDS, S3, Cognito services
- **Existing patterns**: Express API structure, Drizzle ORM, React client - NO changes to application logic
- **Critical compatibility**: Zero frontend code changes, all existing endpoints preserved
- **Phase 1 boundary**: Stories 1-3 deploy API-only (assessment submission working)
- **Phase 2 orchestration**: Stories 4-7 add EventBridge, agents, Step Functions
- Each story must verify existing functionality remains intact and include rollback procedures

The epic should maintain 100% feature parity while establishing production AWS ECS Fargate infrastructure with event-driven agent orchestration."

---

**Document Status:** ✅ Ready for Technical Review and Implementation Planning