import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  h1: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
  h2: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground my-2">{children}</blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <code className="block bg-muted/70 rounded-lg p-2 overflow-x-auto text-xs font-mono my-2">{children}</code>
    ) : (
      <code className="bg-muted/70 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="my-2">{children}</pre>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  th: ({ children }) => <th className="text-left font-semibold px-2 py-1">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border-t border-border/50">{children}</td>,
  hr: () => <hr className="border-border my-2" />,
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground [&_*]:break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
