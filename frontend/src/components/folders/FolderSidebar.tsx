import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { foldersApi } from '@/api/folders';
import { Folder, Plus, ChevronRight, ChevronDown, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { WebhookFolder } from '@/types';
import { FolderDialog } from './FolderDialog';

interface Props {
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
  selectedAccountId?: number | null;
}

export function FolderSidebar({ selectedFolderId, onSelectFolder, selectedAccountId }: Props) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [folderToEdit, setFolderToEdit] = useState<WebhookFolder | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<WebhookFolder | null>(null);
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', selectedAccountId],
    queryFn: () => foldersApi.getAll(selectedAccountId !== null ? { account: selectedAccountId } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: foldersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Folder deleted successfully');
      setShowDeleteAlert(false);
      setFolderToDelete(null);
      // If the deleted folder was selected, clear selection
      if (folderToDelete && selectedFolderId === folderToDelete.id) {
        onSelectFolder(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete folder');
    },
  });

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: WebhookFolder, depth = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={`
            group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
            transition-colors
            ${isSelected 
              ? 'bg-purple-100 text-purple-900' 
              : 'hover:bg-slate-100 text-slate-700'
            }
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasSubfolders && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <Folder className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex-shrink-0">
              {folder.webhook_count}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderToEdit(folder);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderToDelete(folder);
                    setShowDeleteAlert(true);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasSubfolders && isExpanded && (
          <div className="ml-2">
            {folder.subfolders?.map((subfolder) =>
              renderFolder(subfolder, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="w-64 border-r bg-white p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Folders</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1 flex-1 overflow-y-auto">
          {/* All Webhooks option */}
          <div
            className={`
              flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
              transition-colors
              ${selectedFolderId === null
                ? 'bg-purple-100 text-purple-900'
                : 'hover:bg-slate-100 text-slate-700'
              }
            `}
            onClick={() => onSelectFolder(null)}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span className="text-sm font-medium">All Webhooks</span>
            </div>
          </div>

          {/* Folder list */}
          {isLoading ? (
            <div className="text-sm text-slate-500 text-center py-4">
              Loading folders...
            </div>
          ) : folders.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-4">
              No folders yet
            </div>
          ) : (
            folders
              .filter((folder) => !folder.parent) // Only show root folders
              .map((folder) => renderFolder(folder))
          )}
        </div>
      </div>

      <FolderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        selectedAccountId={selectedAccountId}
      />

      <FolderDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        folder={folderToEdit || undefined}
        selectedAccountId={selectedAccountId}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"? This will also delete all webhooks in this folder. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (folderToDelete) {
                  deleteMutation.mutate(folderToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
