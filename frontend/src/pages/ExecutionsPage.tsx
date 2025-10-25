import { useQuery } from '@tanstack/react-query';
import { webhooksApi } from '@/api/webhooks';
import { formatUTCForDisplay } from '@/lib/timezone-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ExecutionsPage() {
  const { data: executions, isLoading } = useQuery({
    queryKey: ['executions'],
    queryFn: webhooksApi.getAllExecutions,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
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
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading executions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Execution History</h2>
        <p className="text-muted-foreground">
          View all webhook execution attempts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {executions && executions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No executions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Webhook ID</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Attempt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions?.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(execution.status)}
                        {getStatusBadge(execution.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      #{execution.webhook}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatUTCForDisplay(execution.executed_at)}
                    </TableCell>
                    <TableCell>
                      {execution.response_code ? (
                        <span className="font-mono text-sm">
                          {execution.response_code}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{execution.attempt_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
