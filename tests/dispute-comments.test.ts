import { afterEach, describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/disputes/[id]/comments/[commentId]/route";
import { GET, POST } from "@/app/api/disputes/[id]/comments/route";
import { DISPUTE_COMMENT_AUTHOR, DISPUTE_COMMENT_PAGE_SIZE } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const SEEDED_COMMENT_IDS = ["cmt_1043_ellis", "cmt_1043_avery"];

const disputeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const commentParams = (id: string, commentId: string) => ({
  params: Promise.resolve({ id, commentId }),
});

function listRequest(id: string, page?: number) {
  const query = page === undefined ? "" : `?page=${page}`;
  return new Request(`http://localhost/api/disputes/${id}/comments${query}`);
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/disputes/dsp_1043/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  await prisma.disputeComment.deleteMany({
    where: { id: { notIn: SEEDED_COMMENT_IDS } },
  });
});

describe("dispute comments", () => {
  it("lists the seeded comments for dsp_1043", async () => {
    const response = await GET(listRequest("dsp_1043"), disputeParams("dsp_1043"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ page: 1, total: 2, totalPages: 1 });
    expect(body.data.map((comment: { id: string }) => comment.id)).toEqual(SEEDED_COMMENT_IDS);
    expect(body.data[0]).toMatchObject({
      authorName: "Ellis Marlow",
      disputeId: "dsp_1043",
    });
    expect(body.data[1]).toMatchObject({
      authorName: DISPUTE_COMMENT_AUTHOR,
      disputeId: "dsp_1043",
    });
  });

  it("returns 404 when the dispute does not exist", async () => {
    const response = await GET(listRequest("dsp_missing"), disputeParams("dsp_missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Dispute not found" });
  });

  it("creates a comment authored by Avery Quinn", async () => {
    const response = await POST(
      createRequest({ body: "  Holding the credit at the catalog price.  " }),
      disputeParams("dsp_1043"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.comment).toMatchObject({
      disputeId: "dsp_1043",
      authorName: DISPUTE_COMMENT_AUTHOR,
      body: "Holding the credit at the catalog price.",
    });
    expect(body.comment.id).toMatch(/^cmt_/);

    const listed = await GET(listRequest("dsp_1043"), disputeParams("dsp_1043"));
    const listedBody = await listed.json();
    expect(listedBody.data.at(-1).id).toBe(body.comment.id);
  });

  it("rejects a blank comment body", async () => {
    const response = await POST(createRequest({ body: "   " }), disputeParams("dsp_1043"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Comment body is required" });
  });

  it("returns 404 when creating a comment on a missing dispute", async () => {
    const response = await POST(createRequest({ body: "Note" }), disputeParams("dsp_missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Dispute not found" });
  });

  it("deletes a comment on its dispute", async () => {
    const created = await POST(createRequest({ body: "Temporary note" }), disputeParams("dsp_1043"));
    const { comment } = await created.json();

    const response = await DELETE(
      new Request(`http://localhost/api/disputes/dsp_1043/comments/${comment.id}`, { method: "DELETE" }),
      commentParams("dsp_1043", comment.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.comment.id).toBe(comment.id);

    const listed = await GET(listRequest("dsp_1043"), disputeParams("dsp_1043"));
    const listedBody = await listed.json();
    expect(listedBody.data.map((row: { id: string }) => row.id)).not.toContain(comment.id);
  });

  it("returns 404 when deleting a comment from a different dispute", async () => {
    const created = await POST(createRequest({ body: "Stays on 1043" }), disputeParams("dsp_1043"));
    const { comment } = await created.json();

    const response = await DELETE(
      new Request(`http://localhost/api/disputes/dsp_1047/comments/${comment.id}`, { method: "DELETE" }),
      commentParams("dsp_1047", comment.id),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Comment not found" });

    const stillThere = await prisma.disputeComment.findUnique({ where: { id: comment.id } });
    expect(stillThere?.disputeId).toBe("dsp_1043");
  });

  it("returns the next page after the page size is filled", async () => {
    const extra = DISPUTE_COMMENT_PAGE_SIZE;
    await prisma.disputeComment.createMany({
      data: Array.from({ length: extra }, (_, index) => ({
        id: `cmt_test_${index}`,
        disputeId: "dsp_1043",
        authorName: DISPUTE_COMMENT_AUTHOR,
        body: `Extra note ${index}`,
        createdAt: new Date(`2026-08-14T12:00:${String(index).padStart(2, "0")}.000Z`),
      })),
    });

    const response = await GET(listRequest("dsp_1043", 2), disputeParams("dsp_1043"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      page: 2,
      total: SEEDED_COMMENT_IDS.length + extra,
      totalPages: 2,
    });
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe("cmt_test_8");
  });
});
