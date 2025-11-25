# Content Calendar & Social Posting - Implementation Plan

## Overview
Transform the current Calendar page into a comprehensive content calendar and social media posting system matching the reference UI, while leveraging existing infrastructure (`posting_queue`, `integrations` tables, edge functions).

---

## Current State Analysis

### ✅ What We Have
1. **Database Tables**:
   - `posting_queue`: Stores scheduled posts with status, platforms, priority
   - `integrations`: Stores connected social accounts (Facebook, Instagram, Twitter, LinkedIn, Gmail)
   - `social_accounts`: Legacy table (to be deprecated/migrated)
   - `published_posts`: Tracks published content with engagement metrics

2. **Edge Functions**:
   - `publish-social-post`: Main publishing orchestrator
   - `update-scheduled-post`: Updates post details
   - `delete-scheduled-post`: Deletes scheduled posts
   - `get-scheduled-posts`: Fetches posts with filters
   - `process-scheduled-posts`: Background processor for publishing
   - `process-queue-retry`: Retry failed posts
   - Platform-specific functions: `post-to-facebook`, `post-to-instagram`, `post-to-twitter`, `post-to-linkedin`
   - `sync-social-engagement`: Updates engagement metrics
   - OAuth functions: `social-auth-initiate`, `social-auth-callback`

3. **Frontend Components**:
   - Calendar view with drag-and-drop (`CalendarView.tsx`, `CalendarEventCard.tsx`)
   - Event details dialog
   - Platform filter
   - Queue manager
   - Basic status filtering

### ❌ What's Missing (Based on Reference UI)

1. **UI/UX Enhancements**:
   - Advanced search bar (posts, hashtags, content)
   - Status filter pills with live counts
   - Platform/Accounts filter dropdowns
   - "Add New" dropdown menu (Create Post, Create Blog, Run Ad, Boost Post)
   - Modern card-based event display in calendar
   - Better empty states
   - Performance analytics overlay

2. **Features**:
   - Best time recommendations (AI-powered)
   - Heat map for posting patterns
   - Content templates and duplications
   - Bulk actions (select multiple posts)
   - Performance monitoring per post
   - Integration health status
   - Quick create menu
   - Draft posts workflow
   - Post preview per platform

3. **Backend Enhancements**:
   - AI-powered best posting time analysis
   - Content optimization suggestions
   - Engagement prediction
   - Template management
   - Bulk operations API

---

## Implementation Phases

## 📋 Phase 1: UI/UX Transformation (Week 1-2)
**Goal**: Match the reference UI exactly

### 1.1 Top Bar Enhancement
- [ ] Implement advanced search bar component
  - Search by content text
  - Search by hashtags
  - Search by post type
  - Real-time filtering
  
- [ ] Status Filter Pills
  - Draft (with count)
  - Scheduled (with count)
  - Processing (with count)
  - Published (with count)
  - Failed (with count)
  - Add click handlers to filter calendar
  - Real-time count updates via Supabase Realtime

- [ ] Platform Filter Dropdown
  - Multi-select platforms
  - Show connected accounts only
  - Integration health indicators

- [ ] Accounts Filter Dropdown
  - Filter by specific social account
  - Group by platform

**Components to Create**:
```
src/components/calendar/
├── SearchBar.tsx (new)
├── StatusFilterPills.tsx (new)
├── PlatformFilterDropdown.tsx (new)
├── AccountsFilterDropdown.tsx (new)
└── CalendarTopBar.tsx (new - combines all above)
```

### 1.2 Calendar Grid Redesign
- [ ] Modernize `CalendarDateCell.tsx`:
  - Cleaner card design for posts
  - Platform icons on cards
  - Status badges
  - Quick actions on hover
  
- [ ] Update `CalendarPostCard.tsx`:
  - Match reference card design
  - Show media thumbnails if available
  - Truncate content with "show more"
  - Platform icons row
  - Status indicator

- [ ] Empty State Improvements
  - Use `CalendarEmptyState.tsx` from reference
  - Add illustrations
  - Clear CTAs

### 1.3 "Add New" Dropdown Menu
- [ ] Replace current "Schedule Post" button
- [ ] Create floating "Add New" button (bottom-right)
- [ ] Dropdown options:
  - **Create Post** → Opens post composer
  - **Create Blog Post** → Navigate to `/content`
  - **Run Advertisement** → Future feature (placeholder)
  - **Boost Post** → Future feature (placeholder)

**Component**:
```
src/components/calendar/QuickCreateMenu.tsx (adapt from reference)
```

---

## 📋 Phase 2: Backend Enhancements (Week 2-3)
**Goal**: Add AI-powered features and optimization

### 2.1 Best Time Recommendations
- [ ] Create `analyze-best-times` edge function
  - Analyze historical `published_posts` engagement
  - Use Gemini 3.0 Pro to identify patterns
  - Return optimal posting times per platform
  - Cache results in `user_profiles` or new table

- [ ] Frontend: `BestTimeRecommendations.tsx` component
  - Popover showing AI recommendations
  - Weekly heat map
  - Click to auto-schedule at optimal time

### 2.2 Content Optimization
- [ ] Create `enhance-social-content` edge function (already exists!)
  - Optimize content for each platform
  - Suggest hashtags
  - Improve engagement potential
  - Character limit compliance

- [ ] Integrate with post composer
  - "Optimize with AI" button
  - Show before/after comparison

### 2.3 Template System
- [ ] Add `post_templates` table:
```sql
CREATE TABLE post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platforms integration_platform[] NOT NULL,
  media_urls TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] CRUD edge functions for templates
- [ ] Frontend: Template selector in post composer

### 2.4 Bulk Operations
- [ ] Update `delete-scheduled-post` to accept multiple IDs
- [ ] Create `bulk-update-posts` edge function
  - Change status for multiple posts
  - Reschedule multiple posts
  - Duplicate posts

---

## 📋 Phase 3: Advanced Features (Week 3-4)
**Goal**: Performance tracking and analytics

### 3.1 Performance Monitor
- [ ] `CalendarPerformanceMonitor.tsx` component
  - Show engagement trends
  - Best performing content types
  - Platform-wise breakdown
  - Week-over-week comparison

- [ ] Fetch data from `published_posts`
- [ ] Use `sync-social-engagement` edge function

### 3.2 Content Calendar Intelligence
- [ ] `ContentCalendarAI.tsx` component
  - Content gap detection
  - Posting frequency recommendations
  - Platform balance suggestions
  - Holiday/event reminders

- [ ] Create `analyze-content-strategy` edge function
  - Use Gemini to analyze posting patterns
  - Suggest improvements

### 3.3 Integration Health
- [ ] `CalendarIntegrationInfo.tsx` component
  - Show connection status
  - Token expiration warnings
  - Reconnection CTAs
  
- [ ] Update `integrations` table queries
- [ ] Add health check endpoint

### 3.4 Draft Workflow
- [ ] Enhance `posting_queue` status = 'draft'
- [ ] Drafts section in calendar
- [ ] Convert draft to scheduled
- [ ] Auto-save drafts

---

## 📋 Phase 4: Polish & Optimization (Week 4)

### 4.1 Real-time Updates
- [ ] Implement Supabase Realtime subscriptions:
```typescript
// Subscribe to posting_queue changes
supabase
  .channel('calendar-updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posting_queue' },
    (payload) => {
      // Update calendar in real-time
    }
  )
  .subscribe()
```

### 4.2 Performance Optimization
- [ ] Implement virtual scrolling for large calendars
- [ ] Lazy load calendar months
- [ ] Optimize queries with indexes
- [ ] Cache best time recommendations

### 4.3 Mobile Responsiveness
- [ ] Test on mobile devices
- [ ] Adjust `CalendarDateCell` for small screens
- [ ] Optimize touch interactions
- [ ] Responsive search bar

### 4.4 Error Handling
- [ ] Graceful degradation for failed API calls
- [ ] Retry mechanisms
- [ ] User-friendly error messages
- [ ] Connection status indicators

---

## 🗂️ Database Migrations Needed

### Migration 1: Add draft support
```sql
-- Already exists in posting_queue
-- status enum includes 'pending', 'scheduled', 'processing', 'published', 'failed', 'cancelled', 'paused'
-- Add 'draft' if not present
ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'draft';
```

### Migration 2: Add templates table
```sql
CREATE TABLE post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platforms integration_platform[] NOT NULL,
  media_urls TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON post_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON post_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON post_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON post_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_post_templates_user_id ON post_templates(user_id);
CREATE INDEX idx_post_templates_created_at ON post_templates(created_at DESC);
```

### Migration 3: Add best times cache
```sql
-- Add to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS best_posting_times JSONB DEFAULT '{}'::jsonb;

-- Store structure:
-- {
--   "instagram": [{"hour": 9, "score": 0.95}, ...],
--   "facebook": [...],
--   "last_analyzed": "2025-11-22T00:00:00Z"
-- }
```

### Migration 4: Add engagement prediction
```sql
-- Add to posting_queue
ALTER TABLE posting_queue
ADD COLUMN IF NOT EXISTS predicted_engagement JSONB DEFAULT NULL;

-- Store structure:
-- {
--   "likes": 150,
--   "comments": 20,
--   "shares": 10,
--   "confidence": 0.85
-- }
```

---

## 🎨 Design System Alignment

All components MUST use semantic tokens from `index.css`:

```css
/* Calendar-specific tokens */
--calendar-event-bg: hsl(var(--muted));
--calendar-event-hover: hsl(var(--accent));
--calendar-today-bg: hsl(var(--primary) / 0.1);
--calendar-past-bg: hsl(var(--muted) / 0.5);

/* Status colors */
--status-draft: hsl(var(--muted-foreground));
--status-scheduled: hsl(var(--primary));
--status-processing: hsl(var(--warning));
--status-published: hsl(var(--success));
--status-failed: hsl(var(--destructive));
```

---

## 🔄 Integration with Existing Systems

### Content Generator Integration
- [ ] "Create Blog Post" in dropdown → Navigate to `/content`
- [ ] Option to auto-schedule blog posts after generation

### Graphics Generator Integration
- [ ] Attach graphics to calendar posts
- [ ] Media library picker in post composer

### Video Generator Integration
- [ ] Attach videos to calendar posts
- [ ] Platform-specific video optimization

### Chat Orchestrator Integration
- [ ] "AI Optimize" button in post composer
- [ ] Content suggestions via chat
- [ ] Schedule posts via chat commands

---

## 🚀 Edge Functions to Create/Update

### New Functions:
1. `analyze-best-times` - AI-powered posting time analysis
2. `predict-engagement` - Predict post performance
3. `analyze-content-strategy` - Overall strategy recommendations
4. `create-post-template` - Save templates
5. `bulk-update-posts` - Bulk operations
6. `get-calendar-stats` - Fetch stats for filter pills

### Functions to Update:
1. `get-scheduled-posts` - Add search functionality
2. `publish-social-post` - Add engagement prediction
3. `update-scheduled-post` - Add template support

---

## 📊 Success Metrics

1. **User Engagement**:
   - % of posts scheduled via calendar vs other methods
   - Average posts per user per week
   - Template usage rate

2. **Feature Adoption**:
   - % using best time recommendations
   - % using AI optimization
   - % using templates

3. **Performance**:
   - Calendar load time < 1s
   - Search response time < 300ms
   - Real-time update latency < 500ms

4. **Content Quality**:
   - Engagement rate improvement for AI-optimized posts
   - Reduction in failed posts
   - Increase in on-time publishing

---

## 🛠️ Development Best Practices

1. **Component Structure**:
   - Small, focused components
   - Reusable across dashboard
   - Proper TypeScript types

2. **State Management**:
   - Use React Query for server state
   - Local state for UI interactions
   - Supabase Realtime for live updates

3. **Error Handling**:
   - Toast notifications for user actions
   - Retry mechanisms for failed operations
   - Fallback UI for errors

4. **Testing**:
   - Unit tests for utilities
   - Integration tests for edge functions
   - Manual testing checklist

---

## 📅 Timeline Summary

- **Week 1-2**: Phase 1 (UI/UX) - Get visual parity with reference
- **Week 2-3**: Phase 2 (Backend) - Add AI features
- **Week 3-4**: Phase 3 (Advanced) - Analytics and intelligence
- **Week 4**: Phase 4 (Polish) - Optimization and mobile

**Total: 4 weeks for complete implementation**

---

## 🔗 Reference Files

- **Code Reference**: `docs/CONTENT_CALENDAR_REFERENCE.txt`
- **UI Screenshots**: Attached in chat (saved reference images)
- **Current Implementation**: `src/pages/Calendar.tsx`, `src/components/calendar/*`

---

## Next Steps

1. **Immediate**: Start with Phase 1.1 - Top Bar Enhancement
2. **Priority**: Get UI matching reference images first
3. **Iterative**: Test each phase before moving to next
4. **User Feedback**: Get early feedback on UI changes

Let's start with Phase 1.1 when you're ready! 🚀
