import { SearchBar } from './SearchBar';
import { StatusFilterPills } from './StatusFilterPills';
import { PlatformFilterDropdown } from './PlatformFilterDropdown';
import { AccountsFilterDropdown } from './AccountsFilterDropdown';
import { QuickCreateMenu } from './QuickCreateMenu';
import type { Database } from '@/integrations/supabase/types';

type QueueStatus = Database['public']['Enums']['queue_status'];
type IntegrationPlatform = Database['public']['Enums']['integration_platform'];

interface StatusCounts {
  draft: number;
  scheduled: number;
  processing: number;
  published: number;
  failed: number;
  pending: number;
  cancelled: number;
  paused: number;
}

interface CalendarTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: StatusCounts;
  selectedStatuses: QueueStatus[];
  onStatusToggle: (status: QueueStatus) => void;
  selectedPlatforms: IntegrationPlatform[];
  onPlatformsChange: (platforms: IntegrationPlatform[]) => void;
  selectedAccountIds: string[];
  onAccountsChange: (accountIds: string[]) => void;
  onCreatePost?: () => void;
}

export function CalendarTopBar({
  searchQuery,
  onSearchChange,
  statusCounts,
  selectedStatuses,
  onStatusToggle,
  selectedPlatforms,
  onPlatformsChange,
  selectedAccountIds,
  onAccountsChange,
  onCreatePost,
}: CalendarTopBarProps) {
  return (
    <div className="space-y-4">
      {/* Search and Actions Row */}
      <div className="flex items-center justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search posts, hashtags, content..."
        />
        <div className="flex items-center gap-2">
          <PlatformFilterDropdown
            selectedPlatforms={selectedPlatforms}
            onPlatformsChange={onPlatformsChange}
          />
          <AccountsFilterDropdown
            selectedAccountIds={selectedAccountIds}
            onAccountsChange={onAccountsChange}
          />
          <QuickCreateMenu onCreatePost={onCreatePost} />
        </div>
      </div>

      {/* Status Filter Pills Row */}
      <StatusFilterPills
        counts={statusCounts}
        selectedStatuses={selectedStatuses}
        onStatusToggle={onStatusToggle}
      />
    </div>
  );
}
