"use client";

import { Card, CardContent } from "@/components/ui/card";

type FlashPiece = {
  id: string;
  isRepeatable: boolean;
  isClaimed: boolean;
};

export function FlashPieceStats({ pieces }: { pieces: FlashPiece[] }) {
  const total = pieces.length;
  const available = pieces.filter((p) => p.isRepeatable || !p.isClaimed).length;
  const repeatable = pieces.filter((p) => p.isRepeatable).length;
  const claimed = pieces.filter((p) => !p.isRepeatable && p.isClaimed).length;

  const stats = [
    { label: "Total Designs", value: total },
    { label: "Available", value: available },
    { label: "Repeatable", value: repeatable },
    { label: "Claimed", value: claimed },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
