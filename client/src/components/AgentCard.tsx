import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Agent {
  name: string;
  specialty: string;
  background: string;
  expertise: string;
  profileImageUrl?: string;
}

interface AgentCardProps {
  agent: Agent;
  priority: 'critical' | 'warning' | 'good';
  className?: string;
}

export function AgentCard({ agent, priority, className }: AgentCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-gradient-to-br from-red-50 to-red-100 border-red-200';
      case 'warning': return 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200';
      case 'good': return 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200';
      default: return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-900';
      case 'warning': return 'text-amber-900';
      case 'good': return 'text-green-900';
      default: return 'text-gray-900';
    }
  };

  const getPrioritySubtextColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700';
      case 'warning': return 'text-amber-700';
      case 'good': return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  const getPriorityDescColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'good': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'good': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critical Priority';
      case 'warning': return 'High Priority';
      case 'good': return 'Strength Area';
      default: return 'Standard Priority';
    }
  };

  return (
    <div className={cn(
      "agent-card border rounded-lg p-4 transition-all duration-300 hover:shadow-lg",
      getPriorityColor(priority),
      className
    )}>
      <div className="flex items-start space-x-3">
        <img 
          src={agent.profileImageUrl || `https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face`} 
          alt={agent.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn("font-semibold truncate", getPriorityTextColor(priority))}>
              {agent.name}
            </h4>
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(priority))}></div>
          </div>
          
          <p className={cn("text-sm mb-1", getPrioritySubtextColor(priority))}>
            {agent.specialty}
          </p>
          
          <p className={cn("text-xs mb-2 line-clamp-2", getPriorityDescColor(priority))}>
            {agent.background}
          </p>
          
          <div className="flex items-center justify-between">
            <span className={cn("text-xs", getPriorityDescColor(priority))}>
              {agent.expertise}
            </span>
            <Badge className={cn("text-xs px-2 py-1", getPriorityBadgeColor(priority))}>
              {getPriorityLabel(priority)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
