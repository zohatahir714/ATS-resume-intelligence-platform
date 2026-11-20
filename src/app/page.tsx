export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-2 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        ATS Resume Intelligence
      </h1>
      <p className="text-sm text-muted-foreground">
        Upload a resume, paste a job description, and get an explainable ATS
        score with suggestions.
      </p>
    </main>
  );
}
