import "./FindingSnippet.scss";

type FindingSnippetProps = {
  code: string;
};

export function FindingSnippet({ code }: FindingSnippetProps) {
  return (
    <pre className="finding-snippet">
      <code className="finding-snippet__code">{code}</code>
    </pre>
  );
}
