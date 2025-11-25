import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Code blocks with syntax highlighting
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg my-2 text-xs"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
              {children}
            </code>
          );
        },
        // Links
        a({ node, children, ...props }: any) {
          return (
            <a
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          );
        },
        // Lists
        ul({ node, children, ...props }: any) {
          return <ul className="list-disc pl-4 my-2 space-y-1" {...props}>{children}</ul>;
        },
        ol({ node, children, ...props }: any) {
          return <ol className="list-decimal pl-4 my-2 space-y-1" {...props}>{children}</ol>;
        },
        // Paragraphs
        p({ node, children, ...props }: any) {
          return <p className="my-1 leading-relaxed" {...props}>{children}</p>;
        },
        // Headings
        h1({ node, children, ...props }: any) {
          return <h1 className="text-xl font-bold mt-4 mb-2" {...props}>{children}</h1>;
        },
        h2({ node, children, ...props }: any) {
          return <h2 className="text-lg font-semibold mt-3 mb-2" {...props}>{children}</h2>;
        },
        h3({ node, children, ...props }: any) {
          return <h3 className="text-base font-semibold mt-2 mb-1" {...props}>{children}</h3>;
        },
        // Blockquotes
        blockquote({ node, children, ...props }: any) {
          return (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2" {...props}>
              {children}
            </blockquote>
          );
        },
        // Tables
        table({ node, children, ...props }: any) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full divide-y divide-border" {...props}>
                {children}
              </table>
            </div>
          );
        },
        thead({ node, children, ...props }: any) {
          return <thead className="bg-muted" {...props}>{children}</thead>;
        },
        tbody({ node, children, ...props }: any) {
          return <tbody className="divide-y divide-border" {...props}>{children}</tbody>;
        },
        tr({ node, children, ...props }: any) {
          return <tr {...props}>{children}</tr>;
        },
        th({ node, children, ...props }: any) {
          return (
            <th className="px-3 py-2 text-left text-xs font-medium" {...props}>
              {children}
            </th>
          );
        },
        td({ node, children, ...props }: any) {
          return <td className="px-3 py-2 text-sm" {...props}>{children}</td>;
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
