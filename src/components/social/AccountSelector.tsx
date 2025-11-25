import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Facebook, Instagram, Twitter, Linkedin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SocialAccount = Tables<'social_accounts'>;

interface AccountSelectorProps {
  selectedAccountIds: string[];
  onAccountsChange: (accountIds: string[]) => void;
  platforms?: Array<'facebook' | 'instagram' | 'twitter' | 'linkedin'>;
  multiple?: boolean;
}

const platformConfig = {
  facebook: { icon: Facebook, color: 'bg-[#1877F2]', name: 'Facebook' },
  instagram: { icon: Instagram, color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', name: 'Instagram' },
  twitter: { icon: Twitter, color: 'bg-[#1DA1F2]', name: 'Twitter' },
  linkedin: { icon: Linkedin, color: 'bg-[#0A66C2]', name: 'LinkedIn' }
};

export function AccountSelector({ 
  selectedAccountIds, 
  onAccountsChange, 
  platforms,
  multiple = true 
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        let query = supabase
          .from('social_accounts')
          .select('*')
          .eq('is_active', true)
          .order('platform')
          .order('account_name');

        if (platforms && platforms.length > 0) {
          query = query.in('platform', platforms);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter out expired accounts
        const activeAccounts = (data || []).filter(account => {
          if (!account.token_expires_at) return true;
          return new Date(account.token_expires_at).getTime() > Date.now();
        });

        setAccounts(activeAccounts);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [platforms]);

  const handleSelectionChange = (value: string) => {
    if (multiple) {
      const isSelected = selectedAccountIds.includes(value);
      if (isSelected) {
        onAccountsChange(selectedAccountIds.filter(id => id !== value));
      } else {
        onAccountsChange([...selectedAccountIds, value]);
      }
    } else {
      onAccountsChange([value]);
    }
  };

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, SocialAccount[]>);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading accounts...</div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No active social accounts found. Please connect your accounts in the Integrations page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Accounts</label>
      
      {multiple ? (
        <div className="space-y-2">
          {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => {
            const config = platformConfig[platform as keyof typeof platformConfig];
            const Icon = config.icon;

            return (
              <div key={platform} className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span>{config.name}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 ml-6">
                  {platformAccounts.map((account) => {
                    const isSelected = selectedAccountIds.includes(account.id);
                    const profileData = account.metadata as any;
                    const profileImage = profileData?.profile?.profile_image_url || profileData?.profile?.picture;

                    return (
                      <div
                        key={account.id}
                        onClick={() => handleSelectionChange(account.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profileImage} />
                          <AvatarFallback className={config.color}>
                            <Icon className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{account.account_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(profileData?.metrics?.followers_count || 0).toLocaleString()} followers
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Select
          value={selectedAccountIds[0] || ''}
          onValueChange={(value) => onAccountsChange([value])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => {
              const config = platformConfig[platform as keyof typeof platformConfig];

              return (
                <SelectGroup key={platform}>
                  <SelectLabel>{config.name}</SelectLabel>
                  {platformAccounts.map((account) => {
                    const profileData = account.metadata as any;
                    const profileImage = profileData?.profile?.profile_image_url || profileData?.profile?.picture;
                    const Icon = config.icon;

                    return (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={profileImage} />
                            <AvatarFallback className={config.color}>
                              <Icon className="h-3 w-3 text-white" />
                            </AvatarFallback>
                          </Avatar>
                          <span>{account.account_name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {multiple && selectedAccountIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedAccountIds.length} account{selectedAccountIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
