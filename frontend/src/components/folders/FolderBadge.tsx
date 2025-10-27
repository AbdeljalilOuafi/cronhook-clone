import { Folder } from 'lucide-react';

interface Props {
  name: string;
  color: string;
  className?: string;
}

export function FolderBadge({ name, color, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <Folder className="w-3 h-3" />
      <span>{name}</span>
    </div>
  );
}
