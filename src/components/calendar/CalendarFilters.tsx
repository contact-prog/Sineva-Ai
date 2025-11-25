import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { PlatformFilterDropdown } from './PlatformFilterDropdown';
import { AccountsFilterDropdown } from './AccountsFilterDropdown';
import { CalendarEvent } from './CalendarGrid';
import { Badge } from '@/components/ui/badge';

interface CalendarFiltersProps {
  selectedPlatforms: string[];
  selectedStatuses: string[];
  selectedAccounts: string[];
  searchQuery: string;
  onPlatformsChange: (platforms: string[]) => void;
  onStatusesChange: (statuses: string[]) => void;
  onAccountsChange: (accounts: string[]) => void;
  onSearchChange: (query: string) => void;
  availableAccounts: Array<{ id: string; name: string; platform: string }>;
  events: CalendarEvent[];
}

export function CalendarFilters({
  selectedPlatforms,
  selectedStatuses,
  selectedAccounts,
  searchQuery,
  onPlatformsChange,
  onStatusesChange,
  onAccountsChange,
  onSearchChange,
  availableAccounts,
  events,
}: CalendarFiltersProps) {
  const hasActiveFilters =
    selectedPlatforms.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedAccounts.length > 0 ||
    searchQuery.length > 0;

  const clearAllFilters = () => {
    onPlatformsChange([]);
    onStatusesChange([]);
    onAccountsChange([]);
    onSearchChange('');
  };

  return (
    <div className="space-y-3">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, hashtags, content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <PlatformFilterDropdown
            selectedPlatforms={selectedPlatforms as any}
            onPlatformsChange={onPlatformsChange as any}
            availablePlatforms={Array.from(new Set(events.map(e => e.platform))) as any}
          />
          
          <AccountsFilterDropdown
            selectedAccountIds={selectedAccounts}
            onAccountsChange={onAccountsChange}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {['scheduled', 'pending', 'processing', 'completed', 'failed'].map((status) => (
          <Badge
            key={status}
            variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => {
              if (selectedStatuses.includes(status)) {
                onStatusesChange(selectedStatuses.filter(s => s !== status));
              } else {
                onStatusesChange([...selectedStatuses, status]);
              }
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({events.filter(e => e.status === status).length})
          </Badge>
        ))}
      </div>
    </div>
  );
}
