import { Check, Users } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AccountsFilterDropdownProps {
  selectedAccountIds: string[];
  onAccountsChange: (accountIds: string[]) => void;
}

export function AccountsFilterDropdown({
  selectedAccountIds,
  onAccountsChange,
}: AccountsFilterDropdownProps) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['connected-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('connected', true)
        .order('platform', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const toggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onAccountsChange(selectedAccountIds.filter((id) => id !== accountId));
    } else {
      onAccountsChange([...selectedAccountIds, accountId]);
    }
  };

  const clearAll = () => {
    onAccountsChange([]);
  };

  const selectAll = () => {
    onAccountsChange(accounts.map((a) => a.id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Accounts
          {selectedAccountIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedAccountIds.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Filter by Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No connected accounts
          </div>
        ) : (
          <>
            {accounts.map((account) => (
              <DropdownMenuCheckboxItem
                key={account.id}
                checked={selectedAccountIds.includes(account.id)}
                onCheckedChange={() => toggleAccount(account.id)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{account.account_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {account.platform}
                  </span>
                </div>
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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
