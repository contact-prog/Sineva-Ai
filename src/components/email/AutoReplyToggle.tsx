import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AutoReplyToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("auto_reply_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load auto-reply settings");
      } else if (!data) {
        // Create settings if they don't exist
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, auto_reply_enabled: false });
        
        if (insertError) {
          console.error("Error creating settings:", insertError);
        }
        setEnabled(false);
      } else {
        setEnabled(data?.auto_reply_enabled || false);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          auto_reply_enabled: checked,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error("Error updating settings:", error);
        throw error;
      }

      setEnabled(checked);
      toast.success(`Auto-reply ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update auto-reply settings");
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-between p-2 border rounded bg-card">
      <div className="space-y-0">
        <Label htmlFor="auto-reply" className="text-[11px] font-medium cursor-pointer">
          Auto-Reply
        </Label>
        <p className="text-[9px] text-muted-foreground">
          Auto-respond to incoming emails
        </p>
      </div>
      <Switch
        id="auto-reply"
        checked={enabled}
        onCheckedChange={handleToggle}
        className="scale-75"
      />
    </div>
  );
};
