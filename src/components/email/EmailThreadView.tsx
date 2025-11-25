import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface EmailMessage {
  from: string;
  date: string;
  content: string;
}

interface EmailThreadViewProps {
  from: string;
  to: string;
  cc?: string[];
  date: string;
  subject: string;
  body: string;
}

export function EmailThreadView({ from, to, cc, date, subject, body }: EmailThreadViewProps) {
  // Parse email thread from body
  const messages = parseEmailThread(body, from, date);

  return (
    <div className="space-y-4">
      {/* Email Header */}
      <div className="border-b border-border pb-4">
        <h3 className="text-lg font-semibold mb-2">{subject}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">{from}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">{to}</span>
          </div>
          {cc && cc.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">CC:</span>
              <div className="flex flex-wrap gap-1">
                {cc.map((recipient, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {recipient}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thread Messages */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.map((message, idx) => (
          <EmailMessageBubble
            key={idx}
            from={message.from}
            date={message.date}
            content={message.content}
            isFirst={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}

interface EmailMessageBubbleProps {
  from: string;
  date: string;
  content: string;
  isFirst: boolean;
}

function EmailMessageBubble({ from, date, content, isFirst }: EmailMessageBubbleProps) {
  const initials = from
    .split("@")[0]
    .split(/[\s._-]/)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Safely format date with validation
  const formatSafeDate = (dateString: string): string => {
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        return dateString; // Return original string if invalid
      }
      return format(dateObj, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateString; // Return original string if format fails
    }
  };

  return (
    <div className={`flex gap-3 ${isFirst ? 'bg-primary/5' : ''} p-3 sm:p-4 rounded-lg border border-border/50`}>
      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
        <AvatarFallback className="text-xs sm:text-sm bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <span className="font-medium text-sm truncate">{from}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatSafeDate(date)}
          </span>
        </div>
        <div 
          className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-p:leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: sanitizeContent(content) }}
        />
      </div>
    </div>
  );
}

function parseEmailThread(body: string, mainFrom: string, mainDate: string): EmailMessage[] {
  // Simple regex to find "On <date>..." markers that indicate quoted replies
  const markerRegex = /On\s+\w+,\s+\w+\s+\d{1,2},\s+\d{4}(?:,|\s+at)\s+[\d:]+\s*[APMapm]*\s+/gi;
  
  // Find all positions where these markers appear
  const markerPositions: number[] = [];
  let match;
  
  while ((match = markerRegex.exec(body)) !== null) {
    markerPositions.push(match.index);
  }
  
  // If no markers found, it's a single message
  if (markerPositions.length === 0) {
    return [{
      from: mainFrom,
      date: mainDate,
      content: cleanEmailContent(body)
    }];
  }
  
  const messages: EmailMessage[] = [];
  
  // First message is everything before the first marker
  const firstMessage = body.substring(0, markerPositions[0]).trim();
  if (firstMessage) {
    messages.push({
      from: mainFrom,
      date: mainDate,
      content: cleanEmailContent(firstMessage)
    });
  }
  
  // Extract each historical message segment
  // We'll just show them as "Previous Message 1", "Previous Message 2", etc.
  // since extracting sender from the marker is unreliable
  for (let i = 0; i < markerPositions.length; i++) {
    const start = markerPositions[i];
    const end = markerPositions[i + 1] || body.length;
    
    // Find where the actual message content starts (after the name/email part)
    const segment = body.substring(start, end);
    
    // Look for common patterns that end the header: "wrote:", email in <>, or newline after name
    const contentStartPatterns = [
      /wrote:\s*/i,
      /<[^>]+>\s*/,
      /[A-Z][a-z]+\s+[A-Z][a-z]+\s+/  // Name pattern
    ];
    
    let contentStart = 0;
    for (const pattern of contentStartPatterns) {
      const match = segment.match(pattern);
      if (match) {
        contentStart = match.index! + match[0].length;
        break;
      }
    }
    
    const messageContent = segment.substring(contentStart).trim();
    const cleaned = cleanEmailContent(messageContent);
    
    if (cleaned) {
      // Try to extract sender from the marker
      const senderMatch = segment.match(/<([^>]+@[^>]+)>/);
      const sender = senderMatch ? senderMatch[1] : `Previous sender`;
      
      messages.push({
        from: sender,
        date: mainDate,
        content: cleaned
      });
    }
  }
  
  return messages.filter(msg => msg.content.length > 10);
}

function cleanEmailContent(content: string): string {
  let cleaned = content;
  
  // Aggressively remove all "On <date>..." patterns
  cleaned = cleaned.replace(/On\s+\w+,?\s+\w+\s+\d{1,2},\s+\d{4}[^<\n]{0,100}?(?:<[^>]+>)?.*?(?:wrote:)?/gi, '');
  
  // Remove standalone email addresses in angle brackets
  cleaned = cleaned.replace(/<[^>]+@[^>]+>/g, '');
  
  // Remove quote markers
  cleaned = cleaned.replace(/^[>\s]*>+\s*/gm, '');
  
  // Remove "wrote:" standalone
  cleaned = cleaned.replace(/\bwrote:\s*/gi, '');
  
  // Remove excessive spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Remove excessive line breaks
  cleaned = cleaned.replace(/\n{2,}/g, '\n');
  
  // Trim each line
  cleaned = cleaned.split('\n').map(line => line.trim()).filter(line => line).join('\n');
  
  return cleaned.trim();
}

function sanitizeContent(html: string): string {
  // Convert plain text to HTML if needed
  let content = html;
  
  // If content doesn't have HTML tags, convert line breaks to <br>
  if (!/<[^>]+>/.test(content)) {
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
  
  // Clean up the content
  let cleaned = content
    .replace(/^(&gt;|\>)\s*/gm, '') // Remove quote markers
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>') // Reduce multiple line breaks
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '') // Remove blockquotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned;
}
