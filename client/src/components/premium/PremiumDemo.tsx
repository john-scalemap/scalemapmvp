import React from 'react';
import { PremiumButton, PremiumCard, PremiumProgress, StatusBadge } from './index';
import { CheckCircle, AlertCircle, Activity, Sparkles } from 'lucide-react';

export function PremiumDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="font-display text-6xl font-bold text-gradient-primary">
            Premium Design System
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            MBB-inspired luxury aesthetic with glassmorphism effects and premium animations
          </p>
        </div>

        {/* Premium Buttons Section */}
        <PremiumCard variant="executive" className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-slate-800">Premium Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Primary</h3>
              <div className="space-y-3">
                <PremiumButton variant="primary" size="sm">
                  Small
                </PremiumButton>
                <PremiumButton variant="primary" size="md">
                  Medium
                </PremiumButton>
                <PremiumButton variant="primary" size="lg" icon={<Sparkles />}>
                  Large with Icon
                </PremiumButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Secondary</h3>
              <div className="space-y-3">
                <PremiumButton variant="secondary" size="sm">
                  Small
                </PremiumButton>
                <PremiumButton variant="secondary" size="md">
                  Medium
                </PremiumButton>
                <PremiumButton variant="secondary" size="lg" icon={<Activity />}>
                  Large with Icon
                </PremiumButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Ghost</h3>
              <div className="space-y-3">
                <PremiumButton variant="ghost" size="sm">
                  Small
                </PremiumButton>
                <PremiumButton variant="ghost" size="md">
                  Medium
                </PremiumButton>
                <PremiumButton variant="ghost" size="lg">
                  Large
                </PremiumButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">States</h3>
              <div className="space-y-3">
                <PremiumButton variant="primary" loading>
                  Loading
                </PremiumButton>
                <PremiumButton variant="primary" disabled>
                  Disabled
                </PremiumButton>
                <PremiumButton variant="outline">
                  Outline
                </PremiumButton>
              </div>
            </div>
          </div>
        </PremiumCard>

        {/* Premium Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <PremiumCard variant="default" interactive className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-slate-800">Default Card</h3>
            <p className="text-slate-600">
              Glassmorphism effect with premium shadows and smooth hover animations.
            </p>
            <PremiumButton variant="primary" size="sm">
              Learn More
            </PremiumButton>
          </PremiumCard>

          <PremiumCard variant="executive" interactive className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-slate-800">Executive Card</h3>
            <p className="text-slate-600">
              Clean gradient background with professional styling for business content.
            </p>
            <PremiumButton variant="secondary" size="sm">
              View Details
            </PremiumButton>
          </PremiumCard>

          <PremiumCard variant="glassmorphism" interactive glow className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-slate-800">Glassmorphism</h3>
            <p className="text-slate-600">
              Enhanced glass effect with purple glow and premium backdrop blur.
            </p>
            <PremiumButton variant="ghost" size="sm">
              Explore
            </PremiumButton>
          </PremiumCard>
        </div>

        {/* Status Badges Section */}
        <PremiumCard variant="executive" className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-slate-800">Status Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatusBadge variant="excellent" icon={<CheckCircle className="w-4 h-4" />}>
              Excellent
            </StatusBadge>
            <StatusBadge variant="good" size="md">
              Good
            </StatusBadge>
            <StatusBadge variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
              Warning
            </StatusBadge>
            <StatusBadge variant="critical" pulse>
              Critical
            </StatusBadge>
            <StatusBadge variant="analysis" animated>
              Analysis
            </StatusBadge>
            <StatusBadge variant="pending" pulse>
              Pending
            </StatusBadge>
          </div>
        </PremiumCard>

        {/* Progress Indicators Section */}
        <PremiumCard variant="default" className="space-y-8">
          <h2 className="font-display text-3xl font-bold text-slate-800">Progress Indicators</h2>
          <div className="space-y-6">
            <PremiumProgress
              value={85}
              variant="primary"
              label="Assessment Progress"
              showPercentage
              shimmer
            />
            <PremiumProgress
              value={92}
              variant="success"
              size="lg"
              label="Health Score"
              showPercentage
            />
            <PremiumProgress
              value={45}
              variant="warning"
              label="Implementation Status"
              showPercentage
            />
            <PremiumProgress
              value={25}
              variant="error"
              size="sm"
              label="Risk Level"
              showPercentage
            />
          </div>
        </PremiumCard>

        {/* Typography Showcase */}
        <PremiumCard variant="glassmorphism" className="space-y-6">
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-bold text-gradient-primary">
              Luxury Typography
            </h1>
            <h2 className="text-4xl font-bold text-slate-800">
              Executive Heading
            </h2>
            <h3 className="text-2xl font-semibold text-slate-700">
              Professional Subheading
            </h3>
            <p className="text-lg text-slate-600 leading-relaxed">
              Premium body text with perfect readability and sophisticated spacing.
              Designed for executive-level content with luxury consulting aesthetics.
            </p>
            <p className="text-sm text-slate-500">
              Supporting text with muted styling for secondary information.
            </p>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}