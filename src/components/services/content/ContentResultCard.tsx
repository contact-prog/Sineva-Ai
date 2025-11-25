import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, RefreshCw, Mail, Share2, Wand2, Image as ImageIcon, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { ShareToEmailModal } from '@/components/shared/ShareToEmailModal';
import { ShareToSocialModal } from '@/components/shared/ShareToSocialModal';
import { PublishToWordPressModal } from '@/components/shared/PublishToWordPressModal';
import { useShareContent } from '@/hooks/useShareContent';
import { useChat } from '@/contexts/ChatContext';
import { useConnectedIntegrations } from '@/hooks/useConnectedIntegrations';

interface ContentResultCardProps {
  content: string;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  contentTopic?: string;
}

export function ContentResultCard({ content, onRegenerate, isRegenerating, contentTopic }: ContentResultCardProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isWordPressModalOpen, setIsWordPressModalOpen] = useState(false);
  const { sendMessage } = useChat();
  const { integrations } = useConnectedIntegrations();
  const { 
    isEmailModalOpen, 
    setIsEmailModalOpen, 
    isSocialModalOpen, 
    setIsSocialModalOpen, 
    shareData, 
    openEmailModal, 
    openSocialModal 
  } = useShareContent();

  // Check if WordPress is connected
  const hasWordPress = integrations.some(
    (int) => int.platform === 'wordpress' && int.connected
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    toast.success('Content copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Content downloaded');
  };

  const handleRepurposeToGraphics = () => {
    sendMessage(`Turn this content into Instagram and LinkedIn graphics: "${editedContent.substring(0, 150)}..."`);
    toast.info('Sending to AI chat for graphics...');
  };

  const handleRepurposeToSocial = () => {
    sendMessage(`Create 3 social media posts from this content for Instagram, LinkedIn, and Twitter: "${editedContent.substring(0, 150)}..."`);
    toast.info('Sending to AI chat for social posts...');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Generated Content</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEmailModal({ content: editedContent, subject: 'Generated Content' })}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openSocialModal({ content: editedContent })}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          {hasWordPress && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsWordPressModalOpen(true)}
            >
              <Globe className="w-4 h-4 mr-2" />
              Publish to WordPress
            </Button>
          )}
        </div>
      </div>

      {/* Repurpose Quick Actions */}
      <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Repurpose This Content</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRepurposeToGraphics}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Create Graphics
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRepurposeToSocial}
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Adapt for Social
          </Button>
        </div>
      </div>
      
      <Textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        rows={20}
        className="font-mono text-sm"
      />

      <ShareToEmailModal
        open={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        content={shareData.content}
        subject={shareData.subject}
      />

      <ShareToSocialModal
        open={isSocialModalOpen}
        onOpenChange={setIsSocialModalOpen}
        content={shareData.content}
        mediaUrls={shareData.mediaUrls}
      />

      <PublishToWordPressModal
        open={isWordPressModalOpen}
        onOpenChange={setIsWordPressModalOpen}
        content={editedContent}
        defaultTitle={contentTopic}
      />
    </Card>
  );
}
