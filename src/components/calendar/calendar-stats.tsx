"use client";

import { CalendarDays, CheckCircle, Clock } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

type CalendarStatsProps = {
  confirmed: number;
  completed: number;
  totalHours: number;
};

export function CalendarStats({
  confirmed,
  completed,
  totalHours,
}: CalendarStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Confirmed This Month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-muted-foreground" />
            <p className="text-3xl font-light">{confirmed}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Completed This Month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="size-5 text-muted-foreground" />
            <p className="text-3xl font-light">{completed}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <p className="text-3xl font-light">{totalHours}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
