import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { webhooksApi } from '@/api/webhooks';
import type { Webhook } from '@/types';
import { formatUTCForDisplay } from '@/lib/timezone-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Trash2, Clock } from 'lucide-react';
import WebhookDialog from '@/components/webhooks/WebhookDialog';
import { FolderSidebar } from '@/components/folders/FolderSidebar';
import { FolderBadge } from '@/components/folders/FolderBadge';

export default function WebhooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showPastTimeAlert, setShowPastTimeAlert] = useState(false);
  const [pastTimeWebhook, setPastTimeWebhook] = useState<Webhook | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks', selectedFolderId],
    queryFn: () => webhooksApi.getAll(selectedFolderId !== null ? { folder: selectedFolderId } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: webhooksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete webhook');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      is_active ? webhooksApi.cancel(id) : webhooksApi.activate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      const message = data?.detail || 'Webhook status updated';
      toast.success(message);
    },
    onError: (error: any, variables) => {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to update webhook status';
      
      // Check if error is due to past scheduled time
      if (errorMessage.includes('scheduled time is in the past')) {
        // Find the webhook that failed
        const failedWebhook = webhooks?.find(w => w.id === variables.id);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading webhooks...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <FolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Webhooks</h2>
            <p className="text-muted-foreground">
              Manage your scheduled HTTP requests
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Webhook</span>
          </Button>
        </div>

      {webhooks && webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No webhooks yet</p>
            <Button onClick={handleCreate} variant="outline">
              Create your first webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {webhooks?.map((webhook) => (
            <Card 
              key={webhook.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                isLoadingDetails ? 'opacity-50 pointer-events-none' : ''
              }`}
              onClick={() => handleCardClick(webhook.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    {webhook.folder_name && webhook.folder_color && (
                      <div className="mt-2">
                        <FolderBadge 
                          name={webhook.folder_name} 
                          color={webhook.folder_color}
                        />
                      </div>
                    )}
                    <CardDescription className="mt-1">
                      {webhook.http_method} {webhook.url}
                    </CardDescription>
                  </div>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">
                      {webhook.schedule_type === 'once' ? 'One-time' : 'Recurring'}
                    </span>
                  </div>
                  {webhook.schedule_type === 'once' && webhook.scheduled_at && (
                    <div>
                      <span className="text-muted-foreground">Scheduled:</span>{' '}
                      <span className="font-medium">
                        {formatUTCForDisplay(webhook.scheduled_at)}
                      </span>
                    </div>
                  )}
                  {webhook.schedule_type === 'recurring' && webhook.cron_expression && (
                    <div>
                      <span className="text-muted-foreground">Cron:</span>{' '}
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
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
                The webhook <strong>"{pastTimeWebhook?.name}"</strong> cannot be activated because its scheduled time is in the past.
              </p>
              <p className="text-sm">
                Would you like to update the scheduled time to activate this webhook?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPastTimeWebhook(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateFromAlert}>
              Update Webhook
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
              Delete Webhook
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
    </div>
  </div>
  );
}
