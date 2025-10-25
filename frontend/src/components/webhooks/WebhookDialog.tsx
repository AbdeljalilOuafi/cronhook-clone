import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as z from 'zod';
import { webhooksApi } from '@/api/webhooks';
import type { Webhook, CreateWebhookRequest } from '@/types';
import { convertLocalToUTC, convertUTCToLocal } from '@/lib/timezone-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  http_method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.string().optional(),
  payload: z.string().optional(),
  schedule_type: z.enum(['once', 'recurring']),
  scheduled_at: z.string().optional(),
  cron_expression: z.string().optional(),
  timezone: z.string().optional(),
  max_retries: z.number().min(0).max(10).optional(),
  retry_delay: z.number().min(0).optional(),
  timeout: z.number().min(1).optional(),
}).refine(
  (data) => {
    if (data.schedule_type === 'once') {
      return !!data.scheduled_at;
    }
    if (data.schedule_type === 'recurring') {
      return !!data.cron_expression;
    }
    return true;
  },
  {
    message: 'Either scheduled_at or cron_expression must be provided',
    path: ['scheduled_at'],
  }
);

type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookDialogProps {
  open: boolean;
  onClose: () => void;
  webhook: Webhook | null;
}

export default function WebhookDialog({ open, onClose, webhook }: WebhookDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!webhook;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      http_method: 'GET',
      schedule_type: 'once',
      timezone: 'UTC',
      max_retries: 3,
      retry_delay: 60,
      timeout: 30,
    },
  });

  const scheduleType = watch('schedule_type');

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        url: webhook.url,
        http_method: webhook.http_method,
        headers: JSON.stringify(webhook.headers, null, 2),
        payload: typeof webhook.payload === 'string' ? webhook.payload : JSON.stringify(webhook.payload, null, 2),
        schedule_type: webhook.schedule_type,
        // Convert UTC to local time for the datetime-local input
        scheduled_at: webhook.scheduled_at ? convertUTCToLocal(webhook.scheduled_at) : undefined,
        cron_expression: webhook.cron_expression,
        timezone: webhook.timezone,
        max_retries: webhook.max_retries,
        retry_delay: webhook.retry_delay,
        timeout: webhook.timeout,
      });
    } else {
      reset({
        http_method: 'GET',
        schedule_type: 'once',
        timezone: 'UTC',
        max_retries: 3,
        retry_delay: 60,
        timeout: 30,
      });
    }
  }, [webhook, reset]);

  const createMutation = useMutation({
    mutationFn: webhooksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create webhook');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateWebhookRequest }) =>
      webhooksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update webhook');
    },
  });

  const onSubmit = (data: WebhookFormData) => {
    const payload: CreateWebhookRequest = {
      name: data.name,
      url: data.url,
      http_method: data.http_method,
      schedule_type: data.schedule_type,
      headers: data.headers ? JSON.parse(data.headers) : {},
      payload: data.payload ? JSON.parse(data.payload) : {},
      max_retries: data.max_retries,
      retry_delay: data.retry_delay,
      timeout: data.timeout,
    };

    // Only include the relevant schedule field based on schedule_type
    if (data.schedule_type === 'once') {
      // Convert local datetime to UTC before sending to backend
      payload.scheduled_at = data.scheduled_at ? convertLocalToUTC(data.scheduled_at) : undefined;
    } else if (data.schedule_type === 'recurring') {
      payload.cron_expression = data.cron_expression;
      payload.timezone = data.timezone;
    }

    if (isEditing) {
      updateMutation.mutate({ id: webhook.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update webhook configuration'
              : 'Configure a new scheduled HTTP request'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="My Webhook"
                  {...register('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="http_method">HTTP Method *</Label>
                <Select
                  value={watch('http_method')}
                  onValueChange={(value) => setValue('http_method', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://api.example.com/endpoint"
                {...register('url')}
                className={errors.url ? 'border-destructive' : ''}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>

            <Tabs value={scheduleType} onValueChange={(v) => setValue('schedule_type', v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="once">One-time</TabsTrigger>
                <TabsTrigger value="recurring">Recurring</TabsTrigger>
              </TabsList>

              <TabsContent value="once" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Scheduled Time *</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    {...register('scheduled_at')}
                    className={errors.scheduled_at ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter time in your local timezone. It will be converted to UTC automatically.
                  </p>
                  {errors.scheduled_at && (
                    <p className="text-sm text-destructive">
                      {errors.scheduled_at.message}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recurring" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cron_expression">Cron Expression *</Label>
                  <Input
                    id="cron_expression"
                    placeholder="0 0 * * *"
                    {...register('cron_expression')}
                    className={errors.cron_expression ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: "0 0 * * *" runs daily at midnight
                  </p>
                  {errors.cron_expression && (
                    <p className="text-sm text-destructive">
                      {errors.cron_expression.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="UTC"
                    {...register('timezone')}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON)</Label>
              <textarea
                id="headers"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                placeholder='{"Content-Type": "application/json"}'
                {...register('headers')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payload">Payload (JSON)</Label>
              <textarea
                id="payload"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                placeholder='{"key": "value"}'
                {...register('payload')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="max_retries">Max Retries</Label>
                <Input
                  id="max_retries"
                  type="number"
                  min="0"
                  max="10"
                  {...register('max_retries', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry_delay">Retry Delay (seconds)</Label>
                <Input
                  id="retry_delay"
                  type="number"
                  min="0"
                  {...register('retry_delay', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="1"
                  {...register('timeout', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update'
                : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
