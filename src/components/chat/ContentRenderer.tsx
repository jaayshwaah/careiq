"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function ContentRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight as any]}
        components={{
          h1: (props) => <h3 {...props} />,
          h2: (props) => <h4 {...props} />,
          h3: (props) => <h5 {...props} />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="min-w-[640px]" {...props} />
            </div>
          ),
          code({ inline, className, children, ...props }) {
            const lang = (className || "").replace("language-", "");
            if (inline) return <code className={className} {...props}>{children}</code>;
            const text = String(children || "");
            return (
              <div className="relative group/code">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(text)}
                  className="absolute right-2 top-2 text-xs px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover/code:opacity-100"
                >
                  Copy
                </button>
                <pre className={className}><code>{text}</code></pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

