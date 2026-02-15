import { useQuery } from "@tanstack/react-query";
import { Loader2, Tag, Calendar, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export default function Changelog() {
  const { data: entries, isLoading } = useQuery<ChangelogEntry[]>({
    queryKey: ["/api/changelog"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-changelog-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-changelog-title">What's New</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Release notes and recent updates</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {entries?.map((entry, idx) => (
              <div key={entry.version} className="relative pl-12" data-testid={`card-changelog-${entry.version}`}>
                <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-primary bg-background z-10" />
                <Card className="overflow-visible">
                  <div className="px-4 py-3 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">
                          <Tag className="w-3 h-3 mr-1" />
                          v{entry.version}
                        </Badge>
                        <span className="font-semibold text-sm">{entry.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <ul className="space-y-1.5">
                      {entry.changes.map((change, ci) => (
                        <li key={ci} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {idx === 0 && (
                    <div className="px-4 pb-3">
                      <Badge variant="outline" className="text-xs">Latest</Badge>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
