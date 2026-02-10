import Link from "next/link";

export function Header() {
  return (
    <header className="flex h-16 items-center border-b border-border px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center">
        <Link href="/dashboard" className="text-lg font-light tracking-wide">
          Studio Saturn
        </Link>
      </div>
    </header>
  );
}
