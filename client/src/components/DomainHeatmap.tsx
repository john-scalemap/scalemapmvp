import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Domain {
  name: string;
  score: number;
  health: 'critical' | 'warning' | 'good' | 'excellent';
  summary: string;
  agent: string;
}

interface DomainHeatmapProps {
  domains: Domain[];
  onDomainClick?: (domain: Domain) => void;
}

export function DomainHeatmap({ domains, onDomainClick }: DomainHeatmapProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'critical': return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'warning': return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'good': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'excellent': return 'bg-green-50 border-green-200 hover:bg-green-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'good': return 'bg-blue-500';
      case 'excellent': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTextColor = (health: string) => {
    switch (health) {
      case 'critical': return 'text-red-800';
      case 'warning': return 'text-amber-800';
      case 'good': return 'text-blue-800';
      case 'excellent': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  const getSummaryColor = (health: string) => {
    switch (health) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'good': return 'text-blue-600';
      case 'excellent': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getAgentColor = (health: string) => {
    switch (health) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'good': return 'text-blue-500';
      case 'excellent': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {domains.map((domain, index) => (
        <div
          key={domain.name}
          className={cn(
            "heatmap-cell border-2 rounded-lg p-4 cursor-pointer transition-all duration-200",
            getHealthColor(domain.health),
            "hover:scale-105 hover:shadow-md"
          )}
          onClick={() => onDomainClick?.(domain)}
          data-testid={`domain-${index}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className={cn("font-semibold", getTextColor(domain.health))}>
              {domain.name}
            </h4>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              getHealthBadgeColor(domain.health)
            )}>
              <span className="text-xs font-bold text-white">
                {domain.score}
              </span>
            </div>
          </div>
          
          <p className={cn("text-sm mb-2", getSummaryColor(domain.health))}>
            {domain.summary}
          </p>
          
          <div className={cn("text-xs", getAgentColor(domain.health))}>
            Agent: {domain.agent}
          </div>
        </div>
      ))}
    </div>
  );
}
