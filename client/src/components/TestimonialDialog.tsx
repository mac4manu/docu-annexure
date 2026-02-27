import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquareHeart } from "lucide-react";

interface Testimonial {
  id: number;
  content: string;
  rating: number;
  role: string | null;
  approved: boolean;
}

export function TestimonialDialog() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existing, isError: existingError } = useQuery<Testimonial | null>({
    queryKey: ["/api/testimonials/mine"],
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, rating, role: role || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your testimonial has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      setOpen(false);
      setContent("");
      setRole("");
      setRating(5);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const alreadySubmitted = !existingError && !!existing;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          data-testid="button-leave-testimonial"
        >
          <MessageSquareHeart className="w-3.5 h-3.5" />
          {alreadySubmitted ? "Feedback Sent" : "Leave Feedback"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {alreadySubmitted ? "Your Testimonial" : "Share Your Experience"}
          </DialogTitle>
        </DialogHeader>

        {alreadySubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">"{existing.content}"</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= existing.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              {existing.approved ? (
                <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">Approved</span>
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Pending review</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoveredStar(s)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                    data-testid={`button-star-${s}`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        s <= (hoveredStar || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your feedback</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What has your experience been like using DocuAnnexure?"
                rows={4}
                maxLength={500}
                data-testid="input-testimonial-content"
              />
              <p className="text-xs text-muted-foreground text-right">{content.length}/500</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your role <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Graduate Researcher, Real Estate Agent"
                maxLength={100}
                data-testid="input-testimonial-role"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => submitMutation.mutate()}
              disabled={content.length < 10 || submitMutation.isPending}
              data-testid="button-submit-testimonial"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Testimonial"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Your testimonial will be reviewed before appearing on the site.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
