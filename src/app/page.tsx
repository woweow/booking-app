import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-6xl font-light tracking-widest text-foreground md:text-7xl">
          STUDIO SATURN
        </h1>
        <p className="text-lg font-light tracking-wide text-muted-foreground">
          Tattoo artistry by Jane
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/bookings/new">Book Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
