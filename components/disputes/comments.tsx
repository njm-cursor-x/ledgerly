"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/dates";

type DisputeComment = {
  id: string;
  disputeId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type CommentsPage = {
  data: DisputeComment[];
  meta: { page: number; total: number; totalPages: number };
};

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

async function fetchComments(disputeId: string, page: number): Promise<CommentsPage> {
  const response = await fetch(`/api/disputes/${encodeURIComponent(disputeId)}/comments?page=${page}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Comments request failed with status ${response.status}.`);
  }
  return response.json() as Promise<CommentsPage>;
}

export function DisputeComments({ disputeId }: { disputeId: string }) {
  const [comments, setComments] = useState<DisputeComment[]>([]);
  const [loadedPage, setLoadedPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"create" | "delete" | "more" | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function applyPage(payload: CommentsPage, mode: "replace" | "append") {
    setComments((current) => (mode === "replace" ? payload.data : [...current, ...payload.data]));
    setLoadedPage(payload.meta.page);
    setTotalPages(payload.meta.totalPages);
    setLoadError(false);
  }

  useEffect(() => {
    let active = true;
    fetchComments(disputeId, 1)
      .then((payload) => {
        if (!active) return;
        setComments(payload.data);
        setLoadedPage(payload.meta.page);
        setTotalPages(payload.meta.totalPages);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [disputeId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy) return;

    setBusy("create");
    setActionError(false);
    try {
      const response = await fetch(`/api/disputes/${encodeURIComponent(disputeId)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!response.ok) {
        setActionError(true);
        return;
      }
      setBody("");
      setConfirmingId(null);
      applyPage(await fetchComments(disputeId, 1), "replace");
    } catch {
      setActionError(true);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(commentId: string) {
    if (confirmingId !== commentId) {
      setConfirmingId(commentId);
      return;
    }
    if (busy) return;

    setBusy("delete");
    setActionError(false);
    try {
      const response = await fetch(
        `/api/disputes/${encodeURIComponent(disputeId)}/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setActionError(true);
        return;
      }
      setConfirmingId(null);
      applyPage(await fetchComments(disputeId, 1), "replace");
    } catch {
      setActionError(true);
    } finally {
      setBusy(null);
    }
  }

  async function onLoadMore() {
    if (busy || loadedPage >= totalPages) return;
    setBusy("more");
    setActionError(false);
    try {
      applyPage(await fetchComments(disputeId, loadedPage + 1), "append");
    } catch {
      setActionError(true);
    } finally {
      setBusy(null);
    }
  }

  const commentFieldId = `dispute-comment-${disputeId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments…</p>
        ) : loadError ? (
          <p className="text-sm text-danger">Comments could not be loaded.</p>
        ) : comments.length === 0 ? (
          <div
            role="list"
            aria-label="comments"
            className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
          >
            No comments yet
          </div>
        ) : (
          <ul aria-label="comments" className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-md border border-border bg-card px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-soft text-xs font-semibold text-foreground"
                    >
                      {initials(comment.authorName)}
                    </span>
                    <div className="leading-tight">
                      <span className="block text-sm font-semibold">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={confirmingId === comment.id ? "destructive" : "outline"}
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => onDelete(comment.id)}
                  >
                    {confirmingId === comment.id ? "Confirm delete" : "Delete comment"}
                  </Button>
                </div>
                <p className="mt-2 pl-11 text-sm leading-relaxed">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        {loadedPage < totalPages ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={onLoadMore} disabled={busy !== null}>
              {busy === "more" ? "Loading comments…" : "Load more comments"}
            </Button>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={onCreate}>
          <Label htmlFor={commentFieldId}>Comment</Label>
          <Textarea
            id={commentFieldId}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a note for this dispute."
          />
          <Button type="submit" disabled={busy !== null || body.trim().length === 0}>
            {busy === "create" ? "Saving comment…" : "Add comment"}
          </Button>
        </form>

        {actionError ? <p className="text-sm text-danger">Comments could not be saved. Try again.</p> : null}
      </CardContent>
    </Card>
  );
}
