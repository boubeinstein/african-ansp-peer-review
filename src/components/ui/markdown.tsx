"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null;

  return (
    <div className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 leading-7">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-4 ml-6 list-disc space-y-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 ml-6 list-decimal space-y-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-7">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline hover:text-primary/80"
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          return isInline ? (
            <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
              {children}
            </code>
          ) : (
            <code className="block p-4 rounded-lg bg-muted overflow-x-auto">
              {children}
            </code>
          );
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
