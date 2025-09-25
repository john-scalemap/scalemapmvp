import type { InsertAgent } from '@shared/schema';
import { AI_AGENTS } from './openai';

// Convert the AI_AGENTS array to the database insert format
export const AGENT_SEED_DATA: InsertAgent[] = AI_AGENTS.map(agent => ({
  name: agent.name,
  specialty: agent.specialty,
  background: agent.background,
  expertise: agent.expertise,
  profileImageUrl: agent.profileImageUrl,
  isActive: true,
}));

// Mapping of domain names to agent specialties for analysis routing
export const DOMAIN_TO_AGENT_MAPPING = {
  "Strategic Alignment": "Strategic Transformation",
  "Financial Management": "Financial Operations", 
  "Revenue Engine": "Revenue Operations",
  "Operations Excellence": "Operations Excellence",
  "People & Organization": "People & Organization",
  "Technology & Data": "Technology & Data",
  "Customer Success": "Customer Success",
  "Product Strategy": "Product Strategy",
  "Market Position": "Market Position",
  "Risk Management": "Risk Management",
  "Innovation Pipeline": "Innovation Pipeline",
  "Governance & Compliance": "Governance & Compliance"
};