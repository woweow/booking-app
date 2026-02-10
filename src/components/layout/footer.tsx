export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Studio Saturn. All rights reserved.</p>
        <div className="flex gap-4">
          <a
            href="mailto:hello@studiosaturn.com"
            className="transition-colors hover:text-foreground"
          >
            hello@studiosaturn.com
          </a>
        </div>
      </div>
    </footer>
  );
}
