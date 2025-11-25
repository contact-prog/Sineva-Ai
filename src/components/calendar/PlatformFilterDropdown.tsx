import { Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type IntegrationPlatform = Database['public']['Enums']['integration_platform'];

interface PlatformFilterDropdownProps {
  selectedPlatforms: IntegrationPlatform[];
  onPlatformsChange: (platforms: IntegrationPlatform[]) => void;
  availablePlatforms?: IntegrationPlatform[];
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
};

export function PlatformFilterDropdown({
  selectedPlatforms,
  onPlatformsChange,
  availablePlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'],
}: PlatformFilterDropdownProps) {
  const togglePlatform = (platform: IntegrationPlatform) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const clearAll = () => {
    onPlatformsChange([]);
  };

  const selectAll = () => {
    onPlatformsChange(availablePlatforms);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Platforms
          {selectedPlatforms.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedPlatforms.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePlatforms.map((platform) => (
          <DropdownMenuCheckboxItem
            key={platform}
            checked={selectedPlatforms.includes(platform)}
            onCheckedChange={() => togglePlatform(platform)}
          >
            {PLATFORM_LABELS[platform] || platform}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between p-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="flex-1 h-7 text-xs"
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="flex-1 h-7 text-xs"
          >
            Select All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
