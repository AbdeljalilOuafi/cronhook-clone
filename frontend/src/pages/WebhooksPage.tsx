import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { webhooksApi } from '@/api/webhooks';
import type { Webhook } from '@/types';
import { formatScheduledTime } from '@/lib/timezone-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Clock, MoreVertical, FolderInput, Search, X, Loader2, ArrowUpDown } from 'lucide-react';
import WebhookDialog from '@/components/webhooks/WebhookDialog';
import { FolderSidebar } from '@/components/folders/FolderSidebar';
import { FolderBadge } from '@/components/folders/FolderBadge';
import { MoveWebhookDialog } from '@/components/webhooks/MoveWebhookDialog';
import { AccountSelector } from '@/components/accounts/AccountSelector';

export default function WebhooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showPastTimeAlert, setShowPastTimeAlert] = useState(false);
  const [pastTimeWebhook, setPastTimeWebhook] = useState<Webhook | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [webhookToMove, setWebhookToMove] = useState<Webhook | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const queryClient = useQueryClient();

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: webhooks, isLoading, isFetching } = useQuery({
    queryKey: ['webhooks', selectedFolderId, selectedAccountId, debouncedSearchQuery],
    queryFn: () => {
      const filters: any = {};
      if (selectedFolderId !== null) filters.folder = selectedFolderId;
      if (selectedAccountId !== null) filters.account = selectedAccountId;
      if (debouncedSearchQuery.trim()) filters.search = debouncedSearchQuery.trim();
      return webhooksApi.getAll(Object.keys(filters).length > 0 ? filters : undefined);
    },
  });

  // Sort webhooks based on selected sort option
  const sortedWebhooks = webhooks ? [...webhooks].sort((a, b) => {
    switch (sortBy) {
      case 'created_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'created_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'schedule_asc':
        // For scheduled_at, handle null values and put them at the end
        const aSchedule = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
        const bSchedule = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
        return aSchedule - bSchedule;
      case 'schedule_desc':
        const aScheduleDesc = a.scheduled_at ? new Date(a.scheduled_at).getTime() : -Infinity;
        const bScheduleDesc = b.scheduled_at ? new Date(b.scheduled_at).getTime() : -Infinity;
        return bScheduleDesc - aScheduleDesc;
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  }) : [];

  const deleteMutation = useMutation({
    mutationFn: webhooksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('SyncHook deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete synchook');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      is_active ? webhooksApi.cancel(id) : webhooksApi.activate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      const message = data?.detail || 'SyncHook status updated';
      toast.success(message);
    },
    onError: (error: any, variables) => {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to update synchook status';
      
      // Check if error is due to past scheduled time
      if (errorMessage.includes('scheduled time is in the past')) {
        // Find the webhook that failed
        const failedWebhook = sortedWebhooks?.find(w => w.id === variables.id);
        if (failedWebhook) {
          setPastTimeWebhook(failedWebhook);
          setShowPastTimeAlert(true);
        }
      } else {
        toast.error(errorMessage);
      }
      
      // Refresh webhook list to sync UI
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const handleCreate = () => {
    setSelectedWebhook(null);
    setIsDialogOpen(true);
  };

  const handleCardClick = async (webhookId: number) => {
    setIsLoadingDetails(true);
    try {
      // Fetch full webhook details from the API
      const webhookDetails = await webhooksApi.getById(webhookId);
      setSelectedWebhook(webhookDetails);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load webhook details');
      console.error('Error loading webhook details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = (webhook: Webhook) => {
    setWebhookToDelete(webhook);
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    if (webhookToDelete) {
      deleteMutation.mutate(webhookToDelete.id);
      setShowDeleteAlert(false);
      setWebhookToDelete(null);
    }
  };

  const handleToggleActive = (webhook: Webhook) => {
    toggleActiveMutation.mutate({
      id: webhook.id,
      is_active: webhook.is_active,
    });
  };

  const handleUpdateFromAlert = async () => {
    if (pastTimeWebhook) {
      setShowPastTimeAlert(false);
      // Fetch full webhook details and open edit dialog
      try {
        const webhookDetails = await webhooksApi.getById(pastTimeWebhook.id);
        setSelectedWebhook(webhookDetails);
        setIsDialogOpen(true);
        setPastTimeWebhook(null);
      } catch (error) {
        toast.error('Failed to load webhook details');
        console.error('Error loading webhook details:', error);
      }
    }
  };

  // Only show full-page loader on initial load, not during search
  if (isLoading && !debouncedSearchQuery && !searchQuery) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading synchooks...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <FolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        selectedAccountId={selectedAccountId}
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">SyncHooks</h2>
            <p className="text-muted-foreground">
              Manage your scheduled HTTP requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AccountSelector 
              selectedAccountId={selectedAccountId}
              onAccountChange={setSelectedAccountId}
            />
            <Button onClick={handleCreate} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New SyncHook</span>
            </Button>
          </div>
        </div>

        {/* Search Bar and Sort */}
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm">
            {isFetching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            )}
            <Input
              placeholder="Search synchooks by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest First</SelectItem>
                <SelectItem value="created_asc">Oldest First</SelectItem>
                <SelectItem value="schedule_asc">Schedule: Soonest</SelectItem>
                <SelectItem value="schedule_desc">Schedule: Latest</SelectItem>
                <SelectItem value="name_asc">Name: A to Z</SelectItem>
                <SelectItem value="name_desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {searchQuery && sortedWebhooks && (
            <p className="text-sm text-muted-foreground">
              Found {sortedWebhooks.length} synchook{sortedWebhooks.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
        </div>

      {sortedWebhooks && sortedWebhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {searchQuery ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-2">No synchooks found matching "{searchQuery}"</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search or search in a different account
                </p>
                <Button 
                  onClick={() => setSearchQuery('')} 
                  variant="outline"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No synchooks yet</p>
                <Button onClick={handleCreate} variant="outline">
                  Create your first synchook
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedWebhooks?.map((webhook) => (
            <Card 
              key={webhook.id}
              className={`transition-all hover:shadow-lg hover:border-primary/50 ${
                isLoadingDetails ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => handleCardClick(webhook.id)}>
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    {webhook.folder_name && webhook.folder_color && (
                      <div className="mt-2">
                        <FolderBadge 
                          name={webhook.folder_name} 
                          color={webhook.folder_color}
                        />
                        {searchQuery && (
                          <span className="text-xs text-muted-foreground ml-2">
                            in {webhook.folder_name}
                          </span>
                        )}
                      </div>
                    )}
                    {searchQuery && !webhook.folder_name && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">
                          No folder
                        </span>
                      </div>
                    )}
                    <CardDescription className="mt-1">
                      {webhook.http_method} {webhook.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setWebhookToMove(webhook);
                            setShowMoveDialog(true);
                          }}
                        >
                          <FolderInput className="mr-2 h-4 w-4" />
                          <span>Move...</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => handleCardClick(webhook.id)} className="cursor-pointer">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">
                      {webhook.schedule_type === 'once' ? 'One-time' : 'Recurring'}
                    </span>
                  </div>
                  
                  {/* Show scheduled time for one-time webhooks */}
                  {webhook.schedule_type === 'once' && webhook.scheduled_at && (
                    <div>
                      <span className="text-muted-foreground">Scheduled:</span>{' '}
                      <span className="font-medium font-mono text-xs">
                        {formatScheduledTime(webhook.scheduled_at)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show cron expression for recurring webhooks */}
                  {webhook.schedule_type === 'recurring' && webhook.cron_expression && (
                    <div>
                      <span className="text-muted-foreground">Cron:</span>{' '}
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded">
                        {webhook.cron_expression}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={() => {
                        // Toggle webhook active state
                        handleToggleActive(webhook);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(webhook);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WebhookDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        webhook={selectedWebhook}
        defaultFolderId={selectedFolderId}
        selectedAccountId={selectedAccountId}
      />

      {/* Alert for past scheduled time */}
      <AlertDialog open={showPastTimeAlert} onOpenChange={setShowPastTimeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Scheduled Time Has Passed
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                The synchook <strong>"{pastTimeWebhook?.name}"</strong> cannot be activated because its scheduled time is in the past.
              </p>
              <p className="text-sm">
                Would you like to update the scheduled time to activate this synchook?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPastTimeWebhook(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateFromAlert}>
              Update SyncHook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete SyncHook
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{webhookToDelete?.name}"</strong>?
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                This action cannot be undone. The webhook and all its execution history will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWebhookToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move webhook dialog */}
      {webhookToMove && (
        <MoveWebhookDialog
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
          webhook={webhookToMove}
        />
      )}
    </div>
  </div>
  );
}
