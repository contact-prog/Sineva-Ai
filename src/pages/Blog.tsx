import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const Blog = () => {
  const posts = [
    {
      title: 'The Future of AI-Powered Marketing',
      excerpt: 'Discover how AI is transforming the marketing landscape and what it means for your business.',
      date: 'Jan 15, 2025',
      category: 'AI & Marketing',
      image: '🚀'
    },
    {
      title: '10 Ways to Boost Your Social Media Engagement',
      excerpt: 'Learn proven strategies to increase engagement and grow your social media following.',
      date: 'Jan 12, 2025',
      category: 'Social Media',
      image: '📱'
    },
    {
      title: 'Content Marketing Strategy for 2025',
      excerpt: 'A comprehensive guide to creating a winning content marketing strategy this year.',
      date: 'Jan 10, 2025',
      category: 'Content',
      image: '✍️'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Badge variant="outline" className="mb-6">
            <Sparkles className="h-4 w-4 mr-2" />
            Blog
          </Badge>
          
          <h1 className="text-5xl font-bold mb-6">
            Latest <span className="gradient-text">Insights</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl">
            Stay updated with the latest trends, tips, and insights in AI-powered marketing.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                <div className="bg-gradient-to-br from-primary/20 to-accent/20 h-48 flex items-center justify-center text-6xl">
                  {post.image}
                </div>
                <div className="p-6">
                  <Badge variant="outline" className="mb-3">{post.category}</Badge>
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
                  <p className="text-xs text-muted-foreground">{post.date}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
