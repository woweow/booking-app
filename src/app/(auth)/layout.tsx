export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-wide text-foreground">
            Studio Saturn
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
