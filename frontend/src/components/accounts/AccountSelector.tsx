import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';

interface AccountSelectorProps {
  selectedAccountId: number | null;
  onAccountChange: (accountId: number | null) => void;
}

export function AccountSelector({ selectedAccountId, onAccountChange }: AccountSelectorProps) {
  const user = useAuthStore((state) => state.user);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
    enabled: user?.is_superuser === true,
  });

  // Don't show selector if not superuser
  if (!user?.is_superuser) {
    return null;
  }

  const selectedAccount = accounts?.find(acc => acc.id === selectedAccountId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Viewing:</span>
      <Select
        value={selectedAccountId?.toString() || 'all'}
        onValueChange={(value) => onAccountChange(value === 'all' ? null : parseInt(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue>
            {selectedAccountId === null 
              ? 'All Accounts' 
              : selectedAccount?.name || 'Select Account'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span className="font-medium">All Accounts</span>
            </div>
          </SelectItem>
          {accounts?.map((account) => (
            <SelectItem key={account.id} value={account.id.toString()}>
              <div className="flex flex-col">
                <span className="font-medium">{account.name}</span>
                {account.email && (
                  <span className="text-xs text-muted-foreground">{account.email}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
