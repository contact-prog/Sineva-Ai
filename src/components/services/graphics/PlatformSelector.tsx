import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/contexts/ChatContext';

interface Platform {
  id: string;
  name: string;
  icon: string;
}

const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'facebook', name: 'Facebook', icon: '👍' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
];

export default function PlatformSelector() {
  const { sendMessage } = useChat();
  const [selected, setSelected] = useState<string[]>([]);

  const togglePlatform = (platformId: string) => {
    setSelected(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    
    const platformNames = selected
      .map(id => PLATFORMS.find(p => p.id === id)?.name)
      .join(', ');
    
    sendMessage(`I want to create graphics for: ${platformNames}`);
  };

  return (
    <Card className="p-4 border-primary/20 bg-card/50">
      <h3 className="font-semibold mb-3">Select Platforms</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {PLATFORMS.map((platform) => (
          <div
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selected.includes(platform.id)}
              onCheckedChange={() => togglePlatform(platform.id)}
            />
            <span className="text-xl">{platform.icon}</span>
            <span className="text-sm font-medium">{platform.name}</span>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {selected.length} platform{selected.length !== 1 ? 's' : ''} selected
          </Badge>
          <Button onClick={handleContinue} size="sm">
            Continue
          </Button>
        </div>
      )}
    </Card>
  );
}
