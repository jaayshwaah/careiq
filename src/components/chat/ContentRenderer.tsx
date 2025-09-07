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
          h1: (props) => <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-4 first:mt-0" {...props} />,
          h2: (props) => <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-3" {...props} />,
          h3: (props) => <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-2" {...props} />,
          p: (props) => <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props} />,
          ul: (props) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
          ol: (props) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
          li: (props) => <li className="text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />,
          em: (props) => <em className="italic text-gray-600 dark:text-gray-400" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic" {...props} />
          ),
          table: (props) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-[640px] border-collapse border border-gray-300 dark:border-gray-600" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-left font-semibold text-gray-900 dark:text-gray-100" {...props} />
          ),
          td: (props) => (
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300" {...props} />
          ),
          code({ inline, className, children, ...props }) {
            const lang = (className || "").replace("language-", "");
            if (inline) return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props}>{children}</code>;
            const text = String(children || "");
            return (
              <div className="relative group/code my-4">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(text)}
                  className="absolute right-2 top-2 text-xs px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover/code:opacity-100 transition-opacity"
                >
                  Copy
                </button>
                <pre className={`${className} bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto`}><code>{text}</code></pre>
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

