import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { platforms } = await req.json();

    // Fetch user's published posts for analysis
    const { data: publishedPosts, error: postsError } = await supabaseClient
      .from('published_posts')
      .select('platform, published_at, likes, comments, shares, views')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);

    if (postsError) throw postsError;

    // Analyze engagement patterns by hour and day of week
    const platformAnalysis: Record<string, any> = {};

    (platforms || ['facebook', 'instagram', 'twitter', 'linkedin']).forEach((platform: string) => {
      const platformPosts = publishedPosts?.filter((p) => p.platform === platform) || [];

      if (platformPosts.length === 0) {
        // Default recommendations when no data
        platformAnalysis[platform] = {
          bestTimes: getDefaultBestTimes(platform),
          confidence: 'low',
          dataPoints: 0,
          insights: `No historical data available. These are industry-standard best times for ${platform}.`,
        };
        return;
      }

      // Analyze engagement by hour
      const hourlyEngagement: Record<number, { total: number; count: number }> = {};
      const dayOfWeekEngagement: Record<number, { total: number; count: number }> = {};

      platformPosts.forEach((post) => {
        const date = new Date(post.published_at!);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const engagement = (post.likes || 0) + (post.comments || 0) * 2 + (post.shares || 0) * 3 + (post.views || 0) * 0.01;

        if (!hourlyEngagement[hour]) {
          hourlyEngagement[hour] = { total: 0, count: 0 };
        }
        hourlyEngagement[hour].total += engagement;
        hourlyEngagement[hour].count += 1;

        if (!dayOfWeekEngagement[dayOfWeek]) {
          dayOfWeekEngagement[dayOfWeek] = { total: 0, count: 0 };
        }
        dayOfWeekEngagement[dayOfWeek].total += engagement;
        dayOfWeekEngagement[dayOfWeek].count += 1;
      });

      // Calculate average engagement per hour
      const hourlyAverage = Object.entries(hourlyEngagement).map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: data.total / data.count,
        postCount: data.count,
      }));

      // Sort by engagement and get top 3 hours
      const topHours = hourlyAverage
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3)
        .map((h) => h.hour);

      // Get best days
      const dayAverage = Object.entries(dayOfWeekEngagement).map(([day, data]) => ({
        day: parseInt(day),
        avgEngagement: data.total / data.count,
      }));

      const topDays = dayAverage
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3)
        .map((d) => getDayName(d.day));

      platformAnalysis[platform] = {
        bestTimes: topHours.map((hour) => ({
          time: `${hour.toString().padStart(2, '0')}:00`,
          hour,
          reason: `High engagement (${hourlyEngagement[hour].count} posts analyzed)`,
        })),
        bestDays: topDays,
        confidence: platformPosts.length >= 20 ? 'high' : platformPosts.length >= 10 ? 'medium' : 'low',
        dataPoints: platformPosts.length,
        insights: generateInsights(platform, topHours, topDays, platformPosts.length),
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: platformAnalysis,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating best time recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getDefaultBestTimes(platform: string) {
  const defaults: Record<string, any> = {
    facebook: [
      { time: '13:00', hour: 13, reason: 'Lunch break peak' },
      { time: '15:00', hour: 15, reason: 'Afternoon engagement' },
      { time: '19:00', hour: 19, reason: 'Evening activity' },
    ],
    instagram: [
      { time: '11:00', hour: 11, reason: 'Late morning scroll' },
      { time: '14:00', hour: 14, reason: 'Afternoon break' },
      { time: '20:00', hour: 20, reason: 'Evening peak' },
    ],
    twitter: [
      { time: '09:00', hour: 9, reason: 'Morning commute' },
      { time: '12:00', hour: 12, reason: 'Lunch hour' },
      { time: '17:00', hour: 17, reason: 'Evening commute' },
    ],
    linkedin: [
      { time: '08:00', hour: 8, reason: 'Start of workday' },
      { time: '12:00', hour: 12, reason: 'Lunch break' },
      { time: '17:00', hour: 17, reason: 'End of workday' },
    ],
  };

  return defaults[platform] || defaults.facebook;
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

function generateInsights(platform: string, topHours: number[], topDays: string[], dataPoints: number): string {
  const hourRanges = topHours.map((h) => {
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  });

  const dominantTime = hourRanges[0];
  const confidence = dataPoints >= 20 ? 'strong' : dataPoints >= 10 ? 'moderate' : 'limited';

  return `Based on ${dataPoints} posts, your audience is most active during ${dominantTime} hours on ${topDays[0]}s. This represents ${confidence} confidence based on historical data.`;
}
