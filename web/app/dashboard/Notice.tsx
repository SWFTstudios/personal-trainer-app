export function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="error">{error}</p>;
  if (success) return <p className="notice">{success}</p>;
  return null;
}
