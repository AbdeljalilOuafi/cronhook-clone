import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { foldersApi } from '@/api/folders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WebhookFolder, CreateFolderRequest, UpdateFolderRequest } from '@/types';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: WebhookFolder; // If editing
  selectedAccountId?: number | null;
}

const PRESET_COLORS = [
  { name: 'Purple', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#818cf8' },
];

export function FolderDialog({ open, onOpenChange, folder, selectedAccountId }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [parentId, setParentId] = useState<number | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', selectedAccountId],
    queryFn: () => foldersApi.getAll(selectedAccountId !== null ? { account: selectedAccountId } : undefined),
    enabled: open,
  });

  // Initialize form when editing
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setColor(folder.color);
      setParentId(folder.parent || null);
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0].value);
      setParentId(null);
    }
  }, [folder, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateFolderRequest) => foldersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateFolderRequest) =>
      foldersApi.update(folder!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      description: description || undefined,
      color,
      parent: parentId || undefined,
      account: selectedAccountId || null,
    };

    if (folder) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const mutation = folder ? updateMutation : createMutation;

  // Filter out current folder and its descendants when selecting parent
  const availableFolders = folder
    ? folders.filter((f) => {
        // Can't be parent of itself
        if (f.id === folder.id) return false;
        // Can't be a parent if it's a descendant
        if (f.full_path?.includes(`/${folder.name}/`)) return false;
        return true;
      })
    : folders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {folder ? 'Edit Folder' : 'Create New Folder'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Hooks"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`
                      h-10 rounded-md border-2 transition-all
                      ${color === preset.value
                        ? 'border-slate-900 scale-105'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Folder (Optional)</Label>
              <select
                id="parent"
                value={parentId || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setParentId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">None (Root Level)</option>
                {availableFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_path || f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {folder ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
