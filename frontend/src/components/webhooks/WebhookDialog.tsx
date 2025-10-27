import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as z from 'zod';
import { webhooksApi } from '@/api/webhooks';
import { foldersApi } from '@/api/folders';
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
  scheduled_at: z.string().nullable().optional(),
  cron_expression: z.string().nullable().optional(),
  timezone: z.string().optional(),
  max_retries: z.number().min(0).max(10).optional(),
  retry_delay: z.number().min(0).optional(),
  timeout: z.number().min(1).optional(),
  folder: z.number().nullable().optional(),
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
    message: 'Scheduled time is required for one-time webhooks',
    path: ['scheduled_at'],
  }
).refine(
  (data) => {
    if (data.schedule_type === 'recurring') {
      return !!data.cron_expression;
    }
    return true;
  },
  {
    message: 'Cron expression is required for recurring webhooks',
    path: ['cron_expression'],
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

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.getAll,
    enabled: open,
  });

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
        cron_expression: webhook.cron_expression || undefined,
        timezone: webhook.timezone,
        max_retries: webhook.max_retries,
        retry_delay: webhook.retry_delay,
        timeout: webhook.timeout,
        folder: webhook.folder || null,
      });
    } else {
      reset({
        http_method: 'GET',
        schedule_type: 'once',
        timezone: 'UTC',
        max_retries: 3,
        retry_delay: 60,
        timeout: 30,
        cron_expression: undefined,
        scheduled_at: undefined,
      });
    }
  }, [webhook, reset]);

  const createMutation = useMutation({
    mutationFn: webhooksApi.create,
    onSuccess: (data) => {
      console.log('✅ Webhook created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook created successfully');
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Create webhook error:', error);
      console.error('❌ Error response:', error.response);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to create webhook';
      toast.error(errorMessage);
      
      // Show detailed errors if available
      if (error.response?.data) {
        Object.keys(error.response.data).forEach(key => {
          if (key !== 'detail' && key !== 'message') {
            toast.error(`${key}: ${error.response.data[key]}`);
          }
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateWebhookRequest }) => {
      console.log('🔵 updateMutation called with:', { id, data });
      return webhooksApi.update(id, data);
    },
    onSuccess: (data) => {
      console.log('✅ Webhook updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook updated successfully');
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Update webhook error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Full error response body:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to update webhook';
      toast.error(errorMessage);
      
      // Show detailed errors if available
      if (error.response?.data) {
        Object.keys(error.response.data).forEach(key => {
          if (key !== 'detail' && key !== 'message') {
            const errorValue = error.response.data[key];
            const errorText = Array.isArray(errorValue) ? errorValue.join(', ') : String(errorValue);
            console.error(`❌ Field error - ${key}:`, errorText);
            toast.error(`${key}: ${errorText}`);
          }
        });
      }
    },
  });

  const onSubmit = async (data: WebhookFormData) => {
    console.log('🔵 Form submitted with data:', data);
    console.log('🔵 Is editing mode:', isEditing);
    console.log('🔵 Webhook ID:', webhook?.id);

    try {
      // Parse JSON fields with error handling
      let parsedHeaders = {};
      let parsedPayload = {};

      if (data.headers) {
        try {
          parsedHeaders = JSON.parse(data.headers);
        } catch (error) {
          console.error('❌ Invalid headers JSON:', error);
          toast.error('Invalid JSON in headers field');
          return;
        }
      }

      if (data.payload) {
        try {
          parsedPayload = JSON.parse(data.payload);
        } catch (error) {
          console.error('❌ Invalid payload JSON:', error);
          toast.error('Invalid JSON in payload field');
          return;
        }
      }

      const payload: CreateWebhookRequest = {
        name: data.name,
        url: data.url,
        http_method: data.http_method,
        schedule_type: data.schedule_type,
        headers: parsedHeaders,
        payload: parsedPayload,
        max_retries: data.max_retries,
        retry_delay: data.retry_delay,
        timeout: data.timeout,
        folder: data.folder || null,
      };

      // Only include the relevant schedule field based on schedule_type
      if (data.schedule_type === 'once') {
        // Convert local datetime to UTC before sending to backend
        payload.scheduled_at = data.scheduled_at ? convertLocalToUTC(data.scheduled_at) : undefined;
        console.log('🔵 One-time webhook - scheduled_at (local):', data.scheduled_at);
        console.log('🔵 One-time webhook - scheduled_at (UTC):', payload.scheduled_at);
      } else if (data.schedule_type === 'recurring') {
        payload.cron_expression = data.cron_expression || undefined;
        payload.timezone = data.timezone;
        console.log('🔵 Recurring webhook - cron:', data.cron_expression);
      }

      console.log('🔵 Final payload being sent to API:', payload);

      if (isEditing) {
        console.log('🔵 Calling UPDATE mutation for webhook ID:', webhook.id);
        updateMutation.mutate({ id: webhook.id, data: payload });
      } else {
        console.log('🔵 Calling CREATE mutation');
        createMutation.mutate(payload);
      }
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
      toast.error('Failed to process form data. Check console for details.');
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

        <form 
          onSubmit={handleSubmit(
            (data) => {
              console.log('✅ Form validation passed!');
              onSubmit(data);
            },
            (errors) => {
              console.error('❌ Form validation failed:', errors);
              toast.error('Please fix form errors before submitting');
              Object.keys(errors).forEach(key => {
                const error = errors[key as keyof typeof errors];
                if (error?.message) {
                  toast.error(`${key}: ${error.message}`);
                }
              });
            }
          )}
          className="space-y-6"
        >
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="folder">Folder (Optional)</Label>
                <Select
                  value={watch('folder')?.toString() || 'none'}
                  onValueChange={(value) => setValue('folder', value === 'none' ? null : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: folder.color }}
                          />
                          {folder.full_path || folder.name}
                        </div>
                      </SelectItem>
                    ))}
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
              onClick={(e) => {
                console.log('🔵 Submit button clicked!');
                console.log('🔵 Button type:', e.currentTarget.type);
                console.log('🔵 Form errors:', errors);
                console.log('🔵 Is editing:', isEditing);
                console.log('🔵 Webhook object:', webhook);
                console.log('🔵 Current form values:', watch());
              }}
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
