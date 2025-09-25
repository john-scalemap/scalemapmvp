# ScaleMap - Growth Bottleneck Intelligence Platform

## Overview

ScaleMap is a comprehensive AI-powered platform that delivers operational assessments and growth bottleneck analysis for scaling companies. The platform combines a React frontend with an Express.js backend, utilizing a multi-agent AI architecture to provide 72-hour business intelligence reports. The system features a comprehensive 12-domain assessment framework, real-time analysis pipeline, and interactive results visualization with implementation guidance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, professional UI
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **File Uploads**: Uppy integration for robust file upload capabilities with AWS S3 support

### Backend Architecture
- **Framework**: Express.js with TypeScript in ESM format
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: OpenID Connect integration with Replit's authentication system
- **Session Management**: Express sessions with PostgreSQL store for persistent user sessions
- **File Storage**: Google Cloud Storage integration with ACL-based access control
- **API Design**: RESTful endpoints with comprehensive error handling and logging

### Database Design
- **User Management**: Comprehensive user profiles with company information and Stripe integration
- **Assessment System**: Multi-table structure supporting assessments, domains, questions, and responses
- **Agent Framework**: Database-driven AI agent management with specialties and activation tracking
- **Document Management**: File upload tracking with metadata and access control
- **Analysis Pipeline**: Job tracking system for background processing and progress monitoring

### AI Agent Architecture
- **Multi-Agent System**: 12 specialized AI agents, each with distinct expertise areas and personalities
- **Domain Mapping**: Each operational domain mapped to specific agent specialties for targeted analysis
- **Activation Logic**: Intelligent agent activation based on assessment scores and domain priorities
- **Analysis Pipeline**: Orchestrated workflow from triage analysis through final report generation
- **Content Generation**: Template-driven content system for consistent, professional deliverables

### Payment Integration
- **Stripe Integration**: Complete payment processing with webhooks for subscription management
- **Customer Management**: Automated customer creation and subscription tracking
- **Assessment Gating**: Payment validation before analysis activation

### Security & Access Control
- **Authentication**: Secure OpenID Connect flow with session management
- **Object ACL**: Granular file access control system with group-based permissions
- **Environment Security**: Comprehensive environment variable management for sensitive credentials
- **HTTPS Enforcement**: Security headers and encrypted connections throughout

## External Dependencies

### Core Infrastructure
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **Google Cloud Storage**: File storage and management with advanced ACL capabilities
- **Replit Authentication**: OpenID Connect provider for secure user authentication

### Payment & Business Services
- **Stripe**: Payment processing, customer management, and subscription billing
- **OpenAI API**: GPT-5 model for multi-agent analysis and content generation

### Development & Deployment
- **Vite**: Frontend build tooling with hot module replacement
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Backend bundling for production deployment

### UI & User Experience
- **Radix UI**: Accessible component primitives for professional interface design
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Consistent iconography throughout the application
- **Uppy**: Advanced file upload handling with cloud storage integration

### External APIs & Services
- **Font Integration**: Google Fonts for typography (Inter, DM Sans, and additional typefaces)
- **Development Tools**: Replit-specific plugins for development environment optimization