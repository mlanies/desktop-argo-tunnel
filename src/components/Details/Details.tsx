import "./Details.css";

export default function Details({
  children,
  summary,
  ...props
}: {
  children: React.ReactNode;
  summary: React.ReactNode;
} & React.DetailedHTMLProps<
  React.DetailsHTMLAttributes<HTMLDetailsElement>,
  HTMLDetailsElement
>) {
  return (
    <details className="twogc-details twogc-gradient flex flex-col" {...props}>
      <summary className="inline-flex items-center !bg-clip-text text-transparent mb-5 list-none before:transition-transform before:duration-300 before:ease-in-out before:content-['▶︎'] before:block before:w-4 before:text-twogc-purple before:text-center">
        {summary}
      </summary>
      {children}
    </details>
  );
}
