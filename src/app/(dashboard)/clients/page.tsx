"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, Loader2, CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  _count?: { bookings: number };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(Array.isArray(data) ? data : data.clients || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  const filtered = search
    ? clients.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
    : clients;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Manage your client relationships
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Users className="size-12 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {search ? "No matching clients found" : "No clients yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Try adjusting your search"
                  : "Clients will appear here when they create bookings"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.email}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-4" />
                      <Badge variant="secondary">
                        {client._count?.bookings || 0} bookings
                      </Badge>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
