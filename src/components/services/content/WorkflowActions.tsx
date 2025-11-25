import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";
import { Image, Share2, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface WorkflowActionsProps {
  content: string;
  contentType: string;
}

export const WorkflowActions = ({ content, contentType }: WorkflowActionsProps) => {
  const { sendMessage } = useChat();

  const handleRepurposeToGraphics = () => {
    const prompt = `Create social media graphics from this ${contentType}:\n\n${content.substring(0, 300)}...`;
    sendMessage(prompt);
    toast.success('Graphics request sent to AI!');
  };

  const handleRepurposeToSocial = () => {
    const prompt = `Turn this ${contentType} into engaging social media posts for Instagram, Twitter, and LinkedIn:\n\n${content.substring(0, 300)}...`;
    sendMessage(prompt);
    toast.success('Social posts request sent to AI!');
  };

  const handleScheduleContent = () => {
    const prompt = `Schedule this content for publishing:\n\n${content.substring(0, 200)}...`;
    sendMessage(prompt);
    toast.success('Scheduling request sent to AI!');
  };

  const handleEnhanceWithAI = () => {
    const prompt = `Enhance this ${contentType} to make it more engaging and professional:\n\n${content.substring(0, 300)}...`;
    sendMessage(prompt);
    toast.success('Enhancement request sent to AI!');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Workflow Actions
        </CardTitle>
        <CardDescription>
          Repurpose this content or connect it to other services
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleRepurposeToGraphics}
        >
          <Image className="mr-2 h-4 w-4" />
          Create Graphics from Content
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleRepurposeToSocial}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Adapt for Social Media
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleScheduleContent}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Schedule for Publishing
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleEnhanceWithAI}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Enhance with AI
        </Button>
      </CardContent>
    </Card>
  );
};
