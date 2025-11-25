import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  Youtube,
  Globe,
  Filter,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Enums } from '@/integrations/supabase/types';

const platformConfig = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'bg-blue-500' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-pink-500' },
  twitter: { icon: Twitter, label: 'Twitter', color: 'bg-sky-500' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-600' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'bg-red-500' },
  tiktok: { icon: Globe, label: 'TikTok', color: 'bg-black dark:bg-white' },
  whatsapp: { icon: Globe, label: 'WhatsApp', color: 'bg-green-500' },
  pinterest: { icon: Globe, label: 'Pinterest', color: 'bg-red-600' },
  google_business: { icon: Globe, label: 'Google Business', color: 'bg-yellow-500' },
  wordpress: { icon: Globe, label: 'WordPress', color: 'bg-blue-700' },
  mailchimp: { icon: Globe, label: 'Mailchimp', color: 'bg-yellow-400' },
  shopify: { icon: Globe, label: 'Shopify', color: 'bg-green-600' },
  facebook_ads: { icon: Facebook, label: 'Facebook Ads', color: 'bg-blue-600' },
  google_ads: { icon: Globe, label: 'Google Ads', color: 'bg-blue-500' },
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  processing: { label: 'Processing', color: 'bg-purple-500' },
  published: { label: 'Published', color: 'bg-green-500' },
  failed: { label: 'Failed', color: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500' },
  paused: { label: 'Paused', color: 'bg-orange-500' },
};

interface PlatformFilterProps {
  selectedPlatforms: Enums<'integration_platform'>[];
  selectedStatuses: Enums<'queue_status'>[];
  onPlatformsChange: (platforms: Enums<'integration_platform'>[]) => void;
  onStatusesChange: (statuses: Enums<'queue_status'>[]) => void;
}

export const PlatformFilter = ({
  selectedPlatforms,
  selectedStatuses,
  onPlatformsChange,
  onStatusesChange,
}: PlatformFilterProps) => {
  const togglePlatform = (platform: Enums<'integration_platform'>) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const toggleStatus = (status: Enums<'queue_status'>) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const clearAllFilters = () => {
    onPlatformsChange([]);
    onStatusesChange([]);
  };

  const activeFiltersCount = selectedPlatforms.length + selectedStatuses.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-background/95 backdrop-blur-sm z-50">
          <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(platformConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <DropdownMenuCheckboxItem
                key={key}
                checked={selectedPlatforms.includes(key as Enums<'integration_platform'>)}
                onCheckedChange={() => togglePlatform(key as Enums<'integration_platform'>)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {config.label}
              </DropdownMenuCheckboxItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(statusConfig).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={selectedStatuses.includes(key as Enums<'queue_status'>)}
              onCheckedChange={() => toggleStatus(key as Enums<'queue_status'>)}
            >
              <div className={`h-2 w-2 rounded-full mr-2 ${config.color}`} />
              {config.label}
            </DropdownMenuCheckboxItem>
          ))}
          {activeFiltersCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filter Badges */}
      {selectedPlatforms.map((platform) => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        return (
          <Badge
            key={platform}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-destructive/20"
            onClick={() => togglePlatform(platform)}
          >
            <Icon className="h-3 w-3" />
            {config.label}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        );
      })}
      {selectedStatuses.map((status) => {
        const config = statusConfig[status];
        return (
          <Badge
            key={status}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-destructive/20"
            onClick={() => toggleStatus(status)}
          >
            <div className={`h-2 w-2 rounded-full ${config.color}`} />
            {config.label}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        );
      })}
    </div>
  );
};
