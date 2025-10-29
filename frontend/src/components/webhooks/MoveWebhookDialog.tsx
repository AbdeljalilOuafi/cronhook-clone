import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { foldersApi } from '@/api/folders';
import { webhooksApi } from '@/api/webhooks';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Webhook } from '@/types';
import { Loader2, Folder, FolderOpen } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook;
}

export function MoveWebhookDialog({ open, onOpenChange, webhook }: Props) {
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(webhook.folder || null);

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => foldersApi.getAll(),
    enabled: open,
  });

  const moveMutation = useMutation({
    mutationFn: async (folderId: number | null) => {
      // Use the bulk_move endpoint with the folder_id
      return webhooksApi.bulkMove([webhook.id], folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Webhook moved successfully');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to move webhook');
    },
  });

  const handleMove = () => {
    if (selectedFolderId === webhook.folder) {
      toast.info('Webhook is already in this folder');
      return;
    }
    moveMutation.mutate(selectedFolderId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move Webhook</DialogTitle>
          <DialogDescription>
            Move "{webhook.name}" to a different folder
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Folder</Label>
            <div className="space-y-1 max-h-[300px] overflow-y-auto border rounded-md p-2">
              {/* No folder option */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
                  transition-colors
                  ${selectedFolderId === null
                    ? 'bg-purple-100 text-purple-900 font-medium'
                    : 'hover:bg-slate-100 text-slate-700'
                  }
                `}
              >
                <FolderOpen className="w-4 h-4" />
                <span>No folder (Root)</span>
              </button>

              {/* Folder list */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
                    transition-colors
                    ${selectedFolderId === folder.id
                      ? 'bg-purple-100 text-purple-900 font-medium'
                      : 'hover:bg-slate-100 text-slate-700'
                    }
                  `}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <Folder className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">
                    {folder.full_path || folder.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {folder.webhook_count} webhooks
                  </span>
                </button>
              ))}

              {folders.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  No folders available. Create a folder first.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={moveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={moveMutation.isPending || selectedFolderId === webhook.folder}
          >
            {moveMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
