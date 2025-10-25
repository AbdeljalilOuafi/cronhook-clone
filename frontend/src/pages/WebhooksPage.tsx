import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { webhooksApi } from '@/api/webhooks';
import type { Webhook } from '@/types';
import { formatUTCForDisplay } from '@/lib/timezone-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Play, Pause } from 'lucide-react';
import WebhookDialog from '@/components/webhooks/WebhookDialog';

export default function WebhooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooksApi.getAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook status updated');
    },
    onError: () => {
      toast.error('Failed to update webhook status');
    },
  });

  const handleCreate = () => {
    setSelectedWebhook(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (webhook: Webhook) => {
    toggleActiveMutation.mutate({
      id: webhook.id,
      is_active: webhook.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading webhooks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
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

                <div className="flex items-center space-x-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(webhook)}
                  >
                    {webhook.is_active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(webhook)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(webhook.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
