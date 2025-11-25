export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_model_usage: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model_family: string
          model_version: string
          operation: string
          output_tokens: number | null
          selection_reason: string | null
          service: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_family: string
          model_version: string
          operation: string
          output_tokens?: number | null
          selection_reason?: string | null
          service: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_family?: string
          model_version?: string
          operation?: string
          output_tokens?: number | null
          selection_reason?: string | null
          service?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          ai_generated: boolean | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          generation_metadata: Json | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          published_at: string | null
          slug: string | null
          status: string
          tags: string[] | null
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_metadata?: Json | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_metadata?: Json | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          id: string
          image_url: string
          is_sample: boolean | null
          metadata: Json | null
          platform: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          id?: string
          image_url: string
          is_sample?: boolean | null
          metadata?: Json | null
          platform?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_sample?: boolean | null
          metadata?: Json | null
          platform?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_history: {
        Row: {
          content_type: string
          created_at: string | null
          generated_content: string
          id: string
          is_sample: boolean | null
          is_template: boolean | null
          length: string | null
          quality_metrics: Json | null
          research_insights: Json | null
          seo_score: Json | null
          template_name: string | null
          template_used: string | null
          tone: string | null
          topic: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          generated_content: string
          id?: string
          is_sample?: boolean | null
          is_template?: boolean | null
          length?: string | null
          quality_metrics?: Json | null
          research_insights?: Json | null
          seo_score?: Json | null
          template_name?: string | null
          template_used?: string | null
          tone?: string | null
          topic: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          generated_content?: string
          id?: string
          is_sample?: boolean | null
          is_template?: boolean | null
          length?: string | null
          quality_metrics?: Json | null
          research_insights?: Json | null
          seo_score?: Json | null
          template_name?: string | null
          template_used?: string | null
          tone?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      content_variations: {
        Row: {
          content: string
          created_at: string | null
          engagement_score: number | null
          framework: string | null
          id: string
          parent_content_id: string | null
          tone: string | null
          variation_number: number
        }
        Insert: {
          content: string
          created_at?: string | null
          engagement_score?: number | null
          framework?: string | null
          id?: string
          parent_content_id?: string | null
          tone?: string | null
          variation_number: number
        }
        Update: {
          content?: string
          created_at?: string | null
          engagement_score?: number | null
          framework?: string | null
          id?: string
          parent_content_id?: string | null
          tone?: string | null
          variation_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_variations_parent_content_id_fkey"
            columns: ["parent_content_id"]
            isOneToOne: false
            referencedRelation: "content_history"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean | null
          conversation_summary: string | null
          created_at: string
          id: string
          last_exported_at: string | null
          last_summary_at: string | null
          memory_snapshot: Json | null
          message_count: number | null
          related_conversations: Json | null
          title: string
          updated_at: string
          user_id: string
          workflow_state: Json | null
        }
        Insert: {
          archived?: boolean | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          last_exported_at?: string | null
          last_summary_at?: string | null
          memory_snapshot?: Json | null
          message_count?: number | null
          related_conversations?: Json | null
          title?: string
          updated_at?: string
          user_id: string
          workflow_state?: Json | null
        }
        Update: {
          archived?: boolean | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          last_exported_at?: string | null
          last_summary_at?: string | null
          memory_snapshot?: Json | null
          message_count?: number | null
          related_conversations?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          workflow_state?: Json | null
        }
        Relationships: []
      }
      email_history: {
        Row: {
          attachments: Json | null
          auto_reply_done: boolean | null
          body: string
          cc_emails: string[] | null
          created_at: string
          direction: string
          error_message: string | null
          event_type: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_auto_reply: boolean | null
          message_html: string | null
          message_id: string | null
          message_text: string | null
          pending_body: boolean | null
          provider_message_id: string | null
          raw_event_json: Json | null
          read_at: string | null
          recipient_email: string
          references_header: string | null
          replied_to_email_id: string | null
          resend_email_id: string | null
          scheduled_for: string | null
          send_mode: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          auto_reply_done?: boolean | null
          body: string
          cc_emails?: string[] | null
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_auto_reply?: boolean | null
          message_html?: string | null
          message_id?: string | null
          message_text?: string | null
          pending_body?: boolean | null
          provider_message_id?: string | null
          raw_event_json?: Json | null
          read_at?: string | null
          recipient_email: string
          references_header?: string | null
          replied_to_email_id?: string | null
          resend_email_id?: string | null
          scheduled_for?: string | null
          send_mode?: string | null
          status: string
          subject: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          auto_reply_done?: boolean | null
          body?: string
          cc_emails?: string[] | null
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_auto_reply?: boolean | null
          message_html?: string | null
          message_id?: string | null
          message_text?: string | null
          pending_body?: boolean | null
          provider_message_id?: string | null
          raw_event_json?: Json | null
          read_at?: string | null
          recipient_email?: string
          references_header?: string | null
          replied_to_email_id?: string | null
          resend_email_id?: string | null
          scheduled_for?: string | null
          send_mode?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_history_replied_to_email_id_fkey"
            columns: ["replied_to_email_id"]
            isOneToOne: false
            referencedRelation: "email_history"
            referencedColumns: ["id"]
          },
        ]
      }
      graphic_generations: {
        Row: {
          api_reason: string | null
          category: string | null
          content_type: string
          cost_estimate: number | null
          created_at: string
          dimensions: string
          enhanced_prompt: string | null
          generation_mode: string | null
          generation_time_ms: number | null
          id: string
          image_url: string
          is_preview: boolean | null
          logo_config: Json | null
          logo_included: boolean | null
          model_family: string | null
          model_reason: string | null
          model_used: string
          model_version: string | null
          parameters: Json | null
          parent_preview_id: string | null
          platform: string
          prompt: string
          reference_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_reason?: string | null
          category?: string | null
          content_type: string
          cost_estimate?: number | null
          created_at?: string
          dimensions: string
          enhanced_prompt?: string | null
          generation_mode?: string | null
          generation_time_ms?: number | null
          id?: string
          image_url: string
          is_preview?: boolean | null
          logo_config?: Json | null
          logo_included?: boolean | null
          model_family?: string | null
          model_reason?: string | null
          model_used: string
          model_version?: string | null
          parameters?: Json | null
          parent_preview_id?: string | null
          platform: string
          prompt: string
          reference_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_reason?: string | null
          category?: string | null
          content_type?: string
          cost_estimate?: number | null
          created_at?: string
          dimensions?: string
          enhanced_prompt?: string | null
          generation_mode?: string | null
          generation_time_ms?: number | null
          id?: string
          image_url?: string
          is_preview?: boolean | null
          logo_config?: Json | null
          logo_included?: boolean | null
          model_family?: string | null
          model_reason?: string | null
          model_used?: string
          model_version?: string | null
          parameters?: Json | null
          parent_preview_id?: string | null
          platform?: string
          prompt?: string
          reference_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graphic_generations_parent_preview_id_fkey"
            columns: ["parent_preview_id"]
            isOneToOne: false
            referencedRelation: "graphic_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          account_email: string | null
          account_id: string | null
          account_name: string | null
          connected: boolean
          created_at: string
          expires_at: string | null
          id: string
          last_error: string | null
          last_tested_at: string | null
          metadata: Json | null
          needs_repair: boolean | null
          platform: Database["public"]["Enums"]["integration_platform"]
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          connected?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          needs_repair?: boolean | null
          platform: Database["public"]["Enums"]["integration_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          connected?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          needs_repair?: boolean | null
          platform?: Database["public"]["Enums"]["integration_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posting_queue: {
        Row: {
          attempts: number | null
          content: string
          created_at: string
          error_message: string | null
          id: string
          integration_ids: string[]
          is_sample: boolean | null
          is_template: boolean | null
          last_attempt_at: string | null
          max_attempts: number | null
          media_urls: string[] | null
          metadata: Json | null
          next_retry_at: string | null
          parent_id: string | null
          platform_post_ids: Json | null
          platforms: Database["public"]["Enums"]["integration_platform"][]
          priority: Database["public"]["Enums"]["post_priority"]
          published_at: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["queue_status"]
          tags: string[] | null
          template_name: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          integration_ids: string[]
          is_sample?: boolean | null
          is_template?: boolean | null
          last_attempt_at?: string | null
          max_attempts?: number | null
          media_urls?: string[] | null
          metadata?: Json | null
          next_retry_at?: string | null
          parent_id?: string | null
          platform_post_ids?: Json | null
          platforms: Database["public"]["Enums"]["integration_platform"][]
          priority?: Database["public"]["Enums"]["post_priority"]
          published_at?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["queue_status"]
          tags?: string[] | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          integration_ids?: string[]
          is_sample?: boolean | null
          is_template?: boolean | null
          last_attempt_at?: string | null
          max_attempts?: number | null
          media_urls?: string[] | null
          metadata?: Json | null
          next_retry_at?: string | null
          parent_id?: string | null
          platform_post_ids?: Json | null
          platforms?: Database["public"]["Enums"]["integration_platform"][]
          priority?: Database["public"]["Enums"]["post_priority"]
          published_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["queue_status"]
          tags?: string[] | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_queue_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posting_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          name: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id: string
          metadata?: Json | null
          name?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          blog_id: string | null
          clicks: number | null
          comments: number | null
          content: string | null
          created_at: string
          external_id: string
          external_url: string
          id: string
          integration_id: string | null
          last_synced_at: string
          likes: number | null
          media_urls: string[] | null
          platform: Database["public"]["Enums"]["integration_platform"]
          published_at: string | null
          queue_id: string | null
          shares: number | null
          status: string
          sync_failures: number | null
          sync_metadata: Json | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          blog_id?: string | null
          clicks?: number | null
          comments?: number | null
          content?: string | null
          created_at?: string
          external_id: string
          external_url: string
          id?: string
          integration_id?: string | null
          last_synced_at?: string
          likes?: number | null
          media_urls?: string[] | null
          platform: Database["public"]["Enums"]["integration_platform"]
          published_at?: string | null
          queue_id?: string | null
          shares?: number | null
          status?: string
          sync_failures?: number | null
          sync_metadata?: Json | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          blog_id?: string | null
          clicks?: number | null
          comments?: number | null
          content?: string | null
          created_at?: string
          external_id?: string
          external_url?: string
          id?: string
          integration_id?: string | null
          last_synced_at?: string
          likes?: number | null
          media_urls?: string[] | null
          platform?: Database["public"]["Enums"]["integration_platform"]
          published_at?: string | null
          queue_id?: string | null
          shares?: number | null
          status?: string
          sync_failures?: number | null
          sync_metadata?: Json | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_published_posts_blog"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_posts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_posts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "posting_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          max_retries: number
          progress_percentage: number
          results: Json | null
          retry_count: number
          status: string
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          progress_percentage?: number
          results?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          website_url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          progress_percentage?: number
          results?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string
          account_id: string
          account_name: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_id: string
          account_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string
          account_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string
          engagement_stats: Json | null
          id: string
          media_urls: string[] | null
          platform_post_ids: Json | null
          published_at: string | null
          scheduled_at: string | null
          social_account_ids: string[]
          status: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          media_urls?: string[] | null
          platform_post_ids?: Json | null
          published_at?: string | null
          scheduled_at?: string | null
          social_account_ids: string[]
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          media_urls?: string[] | null
          platform_post_ids?: Json | null
          published_at?: string | null
          scheduled_at?: string | null
          social_account_ids?: string[]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          credits_used: number
          id: string
          metadata: Json | null
          operation_type: string
          service_type: string
          user_id: string
          was_overage: boolean
        }
        Insert: {
          created_at?: string
          credits_used?: number
          id?: string
          metadata?: Json | null
          operation_type: string
          service_type: string
          user_id: string
          was_overage?: boolean
        }
        Update: {
          created_at?: string
          credits_used?: number
          id?: string
          metadata?: Json | null
          operation_type?: string
          service_type?: string
          user_id?: string
          was_overage?: boolean
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          key: string
          last_used_at: string | null
          memory_type: string
          metadata: Json | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          value: Json
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          key: string
          last_used_at?: string | null
          memory_type: string
          metadata?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          value: Json
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          key?: string
          last_used_at?: string | null
          memory_type?: string
          metadata?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          accent_color: string | null
          app_tour_completed: boolean | null
          brand_voice: string | null
          business_stage: string | null
          company_name: string | null
          created_at: string
          current_channels: string[] | null
          description: string | null
          generation_defaults: Json | null
          goals: string[] | null
          id: string
          industry: string | null
          logo_url: string | null
          monthly_budget: number | null
          notification_preferences: Json | null
          onboarding_completed: boolean
          onboarding_magic_completed: boolean | null
          posting_frequency: Json | null
          primary_color: string | null
          recommended_content_types: string[] | null
          recommended_platforms: string[] | null
          scraped_data: Json | null
          secondary_color: string | null
          tagline: string | null
          target_audience: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          app_tour_completed?: boolean | null
          brand_voice?: string | null
          business_stage?: string | null
          company_name?: string | null
          created_at?: string
          current_channels?: string[] | null
          description?: string | null
          generation_defaults?: Json | null
          goals?: string[] | null
          id: string
          industry?: string | null
          logo_url?: string | null
          monthly_budget?: number | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          onboarding_magic_completed?: boolean | null
          posting_frequency?: Json | null
          primary_color?: string | null
          recommended_content_types?: string[] | null
          recommended_platforms?: string[] | null
          scraped_data?: Json | null
          secondary_color?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          app_tour_completed?: boolean | null
          brand_voice?: string | null
          business_stage?: string | null
          company_name?: string | null
          created_at?: string
          current_channels?: string[] | null
          description?: string | null
          generation_defaults?: Json | null
          goals?: string[] | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          monthly_budget?: number | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          onboarding_magic_completed?: boolean | null
          posting_frequency?: Json | null
          primary_color?: string | null
          recommended_content_types?: string[] | null
          recommended_platforms?: string[] | null
          scraped_data?: Json | null
          secondary_color?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_reply_enabled: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_reply_enabled?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period: string
          chat_limit: number
          chat_used: number
          content_limit: number
          content_used: number
          created_at: string
          current_period_end: string
          current_period_start: string
          email_limit: number
          email_used: number
          graphics_limit: number
          graphics_used: number
          id: string
          overage_credits: number
          plan_tier: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          videos_limit: number
          videos_used: number
        }
        Insert: {
          billing_period?: string
          chat_limit?: number
          chat_used?: number
          content_limit?: number
          content_used?: number
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          email_limit?: number
          email_used?: number
          graphics_limit?: number
          graphics_used?: number
          id?: string
          overage_credits?: number
          plan_tier?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          videos_limit?: number
          videos_used?: number
        }
        Update: {
          billing_period?: string
          chat_limit?: number
          chat_used?: number
          content_limit?: number
          content_used?: number
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          email_limit?: number
          email_used?: number
          graphics_limit?: number
          graphics_used?: number
          id?: string
          overage_credits?: number
          plan_tier?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          videos_limit?: number
          videos_used?: number
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          base_video_url: string | null
          cost_usd: number | null
          created_at: string | null
          duration_seconds: number | null
          extension_count: number | null
          extracted_info: Json | null
          first_frame_url: string | null
          generation_mode: string | null
          generation_time_seconds: number | null
          id: string
          include_audio: boolean | null
          inferred_settings: Json | null
          intermediate_clips_urls: string[] | null
          is_automated: boolean | null
          is_extension: boolean | null
          is_sample: boolean | null
          last_frame_url: string | null
          metadata: Json | null
          original_video_id: string | null
          platforms: string[] | null
          prompt: string
          quality_preference: string | null
          reference_image_url: string | null
          reference_images_urls: string[] | null
          resolution: string | null
          status: string | null
          style: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          user_prompt: string | null
          veo_model_used: string | null
          video_quality: string | null
          video_url: string | null
        }
        Insert: {
          base_video_url?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          extension_count?: number | null
          extracted_info?: Json | null
          first_frame_url?: string | null
          generation_mode?: string | null
          generation_time_seconds?: number | null
          id?: string
          include_audio?: boolean | null
          inferred_settings?: Json | null
          intermediate_clips_urls?: string[] | null
          is_automated?: boolean | null
          is_extension?: boolean | null
          is_sample?: boolean | null
          last_frame_url?: string | null
          metadata?: Json | null
          original_video_id?: string | null
          platforms?: string[] | null
          prompt: string
          quality_preference?: string | null
          reference_image_url?: string | null
          reference_images_urls?: string[] | null
          resolution?: string | null
          status?: string | null
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          user_prompt?: string | null
          veo_model_used?: string | null
          video_quality?: string | null
          video_url?: string | null
        }
        Update: {
          base_video_url?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          extension_count?: number | null
          extracted_info?: Json | null
          first_frame_url?: string | null
          generation_mode?: string | null
          generation_time_seconds?: number | null
          id?: string
          include_audio?: boolean | null
          inferred_settings?: Json | null
          intermediate_clips_urls?: string[] | null
          is_automated?: boolean | null
          is_extension?: boolean | null
          is_sample?: boolean | null
          last_frame_url?: string | null
          metadata?: Json | null
          original_video_id?: string | null
          platforms?: string[] | null
          prompt?: string
          quality_preference?: string | null
          reference_image_url?: string | null
          reference_images_urls?: string[] | null
          resolution?: string | null
          status?: string | null
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          user_prompt?: string | null
          veo_model_used?: string | null
          video_quality?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_original_video_id_fkey"
            columns: ["original_video_id"]
            isOneToOne: false
            referencedRelation: "video_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_story_scenes: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          end_time_ms: number | null
          id: string
          image_url: string | null
          mood: string | null
          narration: string | null
          scene_number: number
          start_time_ms: number | null
          video_clip_url: string | null
          video_generation_id: string
          visual_description: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time_ms?: number | null
          id?: string
          image_url?: string | null
          mood?: string | null
          narration?: string | null
          scene_number: number
          start_time_ms?: number | null
          video_clip_url?: string | null
          video_generation_id: string
          visual_description?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time_ms?: number | null
          id?: string
          image_url?: string | null
          mood?: string | null
          narration?: string | null
          scene_number?: number
          start_time_ms?: number | null
          video_clip_url?: string | null
          video_generation_id?: string
          visual_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_story_scenes_video_generation_id_fkey"
            columns: ["video_generation_id"]
            isOneToOne: false
            referencedRelation: "video_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          aspect_ratio: string | null
          created_at: string | null
          duration_seconds: number | null
          end_frame_url: string | null
          error_message: string | null
          id: string
          mode: string | null
          model: string | null
          negative_prompt: string | null
          operation_name: string | null
          progress: number | null
          prompt: string
          start_frame_url: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          end_frame_url?: string | null
          error_message?: string | null
          id?: string
          mode?: string | null
          model?: string | null
          negative_prompt?: string | null
          operation_name?: string | null
          progress?: number | null
          prompt: string
          start_frame_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          end_frame_url?: string | null
          error_message?: string | null
          id?: string
          mode?: string | null
          model?: string | null
          negative_prompt?: string | null
          operation_name?: string | null
          progress?: number | null
          prompt?: string
          start_frame_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          original_prompt: string
          plan: Json | null
          results: Json | null
          status: string
          user_id: string
          workflow_type: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          original_prompt: string
          plan?: Json | null
          results?: Json | null
          status?: string
          user_id: string
          workflow_type: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          original_prompt?: string
          plan?: Json | null
          results?: Json | null
          status?: string
          user_id?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          action: string
          agent: string
          completed_at: string | null
          error_message: string | null
          id: string
          parameters: Json | null
          purpose: string | null
          result: Json | null
          started_at: string | null
          status: string | null
          step_number: number
          workflow_id: string | null
        }
        Insert: {
          action: string
          agent: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          parameters?: Json | null
          purpose?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_number: number
          workflow_id?: string | null
        }
        Update: {
          action?: string
          agent?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          parameters?: Json | null
          purpose?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_number?: number
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_account: { Args: never; Returns: undefined }
      get_user_memory_context: {
        Args: { p_category?: string; p_user_id: string }
        Returns: Json
      }
      reset_usage_on_cycle: { Args: never; Returns: undefined }
    }
    Enums: {
      integration_platform:
        | "facebook"
        | "instagram"
        | "twitter"
        | "linkedin"
        | "whatsapp"
        | "tiktok"
        | "youtube"
        | "pinterest"
        | "google_business"
        | "wordpress"
        | "mailchimp"
        | "shopify"
        | "facebook_ads"
        | "google_ads"
      post_priority: "low" | "medium" | "high" | "urgent"
      queue_status:
        | "pending"
        | "scheduled"
        | "processing"
        | "published"
        | "failed"
        | "cancelled"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      integration_platform: [
        "facebook",
        "instagram",
        "twitter",
        "linkedin",
        "whatsapp",
        "tiktok",
        "youtube",
        "pinterest",
        "google_business",
        "wordpress",
        "mailchimp",
        "shopify",
        "facebook_ads",
        "google_ads",
      ],
      post_priority: ["low", "medium", "high", "urgent"],
      queue_status: [
        "pending",
        "scheduled",
        "processing",
        "published",
        "failed",
        "cancelled",
        "paused",
      ],
    },
  },
} as const
