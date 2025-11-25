import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShareToEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  subject?: string;
}

export function ShareToEmailModal({ open, onOpenChange, content, subject }: ShareToEmailModalProps) {
  const [emailSubject, setEmailSubject] = useState(subject || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const navigate = useNavigate();

  const handleSendToEmail = () => {
    // Navigate to email generator with pre-filled content
    navigate('/app/email-generator', {
      state: {
        prefilledSubject: emailSubject,
        prefilledContent: content,
        prefilledRecipient: recipientEmail
      }
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send as Email
          </DialogTitle>
          <DialogDescription>
            Send this content via email or continue editing in the email generator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="recipient">Recipient (optional)</Label>
            <Input
              id="recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <Label htmlFor="email-content">Content</Label>
            <Textarea
              id="email-content"
              value={content}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendToEmail}>
              Open in Email Generator
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
