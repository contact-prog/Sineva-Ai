import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function PerformanceMonitor() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [engagementTrend, setEngagementTrend] = useState<any[]>([]);
  const [platformPerformance, setPlatformPerformance] = useState<any[]>([]);
  const [bestTimes, setBestTimes] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      const { data: posts, error } = await supabase
        .from('published_posts')
        .select('*')
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: true });

      if (error) throw error;

      // Calculate engagement trend
      const trendData = calculateEngagementTrend(posts || [], days);
      setEngagementTrend(trendData);

      // Calculate platform performance
      const platformData = calculatePlatformPerformance(posts || []);
      setPlatformPerformance(platformData);

      // Calculate best posting times
      const timesData = calculateBestTimes(posts || []);
      setBestTimes(timesData);

      // Get top performing posts
      const topPostsData = getTopPosts(posts || []);
      setTopPosts(topPostsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEngagementTrend = (posts: any[], days: number) => {
    const trend = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i);
      const dayPosts = posts.filter(p => {
        const postDate = new Date(p.published_at);
        return postDate.toDateString() === date.toDateString();
      });

      const engagement = dayPosts.reduce((sum, p) => 
        sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0
      );
      const views = dayPosts.reduce((sum, p) => sum + (p.views || 0), 0);

      trend.push({
        date: format(date, 'MMM d'),
        engagement,
        views,
        posts: dayPosts.length
      });
    }
    return trend;
  };

  const calculatePlatformPerformance = (posts: any[]) => {
    const platformMap = new Map();

    posts.forEach(post => {
      if (!platformMap.has(post.platform)) {
        platformMap.set(post.platform, {
          platform: post.platform,
          posts: 0,
          views: 0,
          engagement: 0
        });
      }

      const data = platformMap.get(post.platform);
      data.posts++;
      data.views += post.views || 0;
      data.engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    });

    return Array.from(platformMap.values()).map(data => ({
      ...data,
      avgEngagement: data.posts > 0 ? Math.round(data.engagement / data.posts) : 0
    }));
  };

  const calculateBestTimes = (posts: any[]) => {
    const hourMap = new Map();

    posts.forEach(post => {
      if (!post.published_at) return;
      const hour = new Date(post.published_at).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { hour, engagement: 0, count: 0 });
      }
      const data = hourMap.get(hour);
      data.engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      data.count++;
    });

    return Array.from(hourMap.values())
      .map(data => ({
        time: `${data.hour}:00`,
        avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);
  };

  const getTopPosts = (posts: any[]) => {
    return posts
      .map(post => ({
        ...post,
        totalEngagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
      }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Engagement Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trend</CardTitle>
          <CardDescription>Views and engagement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#8884d8" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="engagement" 
                stroke="#82ca9d" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Average engagement by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgEngagement" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Best Posting Times */}
        <Card>
          <CardHeader>
            <CardTitle>Best Posting Times</CardTitle>
            <CardDescription>Top 5 times by engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestTimes.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.time}</span>
                  </div>
                  <Badge variant="secondary">
                    {item.avgEngagement} avg engagement
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
          <CardDescription>Your best content in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPosts.map((post, index) => (
              <div key={post.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {post.platform}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {post.published_at && format(new Date(post.published_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {post.content && (
                    <p className="text-sm line-clamp-2">{post.content}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span>{(post.views || 0).toLocaleString()} views</span>
                    <span>{post.totalEngagement.toLocaleString()} engagement</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
