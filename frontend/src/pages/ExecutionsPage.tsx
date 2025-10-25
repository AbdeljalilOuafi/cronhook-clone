import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { webhooksApi } from '@/api/webhooks';
import { formatUTCForDisplay } from '@/lib/timezone-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Calendar, Activity } from 'lucide-react';
import type { Webhook } from '@/types';

export default function ExecutionsPage() {
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);

  const { data: webhooks, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooksApi.getAll,
  });

  const { data: executions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['executions', selectedWebhook?.id],
    queryFn: () => selectedWebhook ? webhooksApi.getExecutions(selectedWebhook.id) : Promise.resolve([]),
    enabled: !!selectedWebhook,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'retrying':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary',
      retrying: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className={
        status === 'success' ? 'bg-green-500 hover:bg-green-600' : ''
      }>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoadingWebhooks) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading webhooks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Execution History</h2>
        <p className="text-muted-foreground">
          Select a webhook to view its execution history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {webhooks && webhooks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No webhooks created yet
              </p>
            ) : (
              <div className="space-y-2">
                {webhooks?.map((webhook) => (
                  <Card
                    key={webhook.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedWebhook?.id === webhook.id
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    onClick={() => setSelectedWebhook(webhook)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-sm">{webhook.name}</h3>
                          <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            <span>{webhook.execution_count || 0} executions</span>
                          </div>
                          {webhook.last_execution_status && (
                            <div className="flex items-center gap-1">
                              {getStatusIcon(webhook.last_execution_status)}
                              <span>{webhook.last_execution_status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Execution Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedWebhook ? (
              <p className="text-center text-muted-foreground py-8">
                Select a webhook to view execution history
              </p>
            ) : isLoadingExecutions ? (
              <p className="text-center text-muted-foreground py-8">
                Loading executions...
              </p>
            ) : executions && executions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No executions yet</p>
                <p className="text-sm text-muted-foreground">
                  {selectedWebhook.name} hasn't been executed yet
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {executions?.map((execution) => (
                  <Card key={execution.id} className="border-l-4" style={{
                    borderLeftColor: 
                      execution.status === 'success' ? '#22c55e' : 
                      execution.status === 'failed' ? '#ef4444' : 
                      '#f59e0b'
                  }}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            {getStatusBadge(execution.status)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Attempt #{execution.attempt_number}
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Executed:</span>
                            <span className="font-mono">
                              {formatUTCForDisplay(execution.executed_at)}
                            </span>
                          </div>
                          
                          {execution.response_code && (
                            <div className="flex items-center justify-between text-muted-foreground mt-1">
                              <span>Response Code:</span>
                              <span className={`font-mono font-semibold ${
                                execution.response_code >= 200 && execution.response_code < 300
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {execution.response_code}
                              </span>
                            </div>
                          )}
                          
                          {execution.error_message && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                Error:
                              </span>
                              <p className="text-red-700 dark:text-red-300 mt-1">
                                {execution.error_message}
                              </p>
                            </div>
                          )}
                          
                          {execution.response_body && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                View Response Body
                              </summary>
                              <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-x-auto">
                                {JSON.stringify(JSON.parse(execution.response_body), null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
