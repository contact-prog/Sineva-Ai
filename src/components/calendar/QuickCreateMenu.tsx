import { Plus, FileText, Megaphone, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface QuickCreateMenuProps {
  onCreatePost?: () => void;
}

export function QuickCreateMenu({ onCreatePost }: QuickCreateMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCreatePost}>
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/app/content')}>
          <FileText className="mr-2 h-4 w-4" />
          Create Blog Post
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Megaphone className="mr-2 h-4 w-4" />
          Run Advertisement
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <TrendingUp className="mr-2 h-4 w-4" />
          Boost Post
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
