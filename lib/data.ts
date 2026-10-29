import { prisma } from "@/lib/prisma";
import {
  DASHBOARD_WINDOWS,
  catalogMrrCents,
  collectedCents,
  disputeBreakdown,
  disputeCentsAt,
  openCentsAt,
  percentChange,
  revenueSeries,
} from "@/lib/dashboard";
import type { DisputeStatus, InvoiceStatus } from "@/lib/status";

const invoiceInclude = {
  customer: true,
  lines: true,
  disputes: true,
} as const;

const disputeInclude = {
  invoice: {
    include: {
      customer: true,
      lines: true,
    },
  },
} as const;

export async function getDashboard() {
  const [invoices, disputes, customers] = await Promise.all([
    prisma.invoice.findMany({ include: invoiceInclude, orderBy: { issuedOn: "desc" } }),
    prisma.dispute.findMany({ include: disputeInclude, orderBy: { openedOn: "desc" } }),
    prisma.customer.findMany(),
  ]);

  const { currentStart, currentEnd, priorStart, priorEnd } = DASHBOARD_WINDOWS;
  const collectedCurrent = collectedCents(invoices, currentStart, currentEnd);
  const collectedPrior = collectedCents(invoices, priorStart, priorEnd);
  const openCurrent = openCentsAt(invoices, currentEnd);
  const openPrior = openCentsAt(invoices, priorEnd);
  const disputeCurrent = disputeCentsAt(disputes, currentEnd);
  const disputePrior = disputeCentsAt(disputes, priorEnd);
  const openNow = invoices.filter((invoice) => invoice.status === "OPEN" || invoice.status === "OVERDUE");
  const needsReview = disputes.filter((dispute) => dispute.status === "NEEDS_REVIEW");
  const openDisputes = disputes.filter(
    (dispute) => dispute.status === "OPEN" || dispute.status === "NEEDS_REVIEW",
  );

  return {
    invoices,
    disputes,
    series: revenueSeries(invoices, currentStart, currentEnd),
    breakdown: disputeBreakdown(disputes),
    kpis: {
      mrrCents: catalogMrrCents(customers),
      accountCount: customers.length,
      openCount: openNow.length,
      openCents: openCurrent,
      openChange: percentChange(openCurrent, openPrior),
      collectedAugustCents: collectedCurrent,
      collectedAugustCount: invoices.filter(
        (invoice) =>
          invoice.status === "PAID" &&
          invoice.paidOn &&
          invoice.paidOn >= currentStart &&
          invoice.paidOn <= currentEnd,
      ).length,
      collectedChange: percentChange(collectedCurrent, collectedPrior),
      disputeCents: disputeCurrent,
      disputeChange: percentChange(disputeCurrent, disputePrior),
      reviewCount: needsReview.length,
      openDisputeCount: openDisputes.length,
    },
  };
}

export async function getInvoices(filters?: { status?: string; q?: string }) {
  const invoices = await prisma.invoice.findMany({
    include: invoiceInclude,
    orderBy: { issuedOn: "desc" },
  });

  return invoices.filter((invoice) => {
    if (filters?.status && filters.status !== "ALL" && invoice.status !== filters.status) {
      return false;
    }
    if (filters?.q) {
      const haystack = `${invoice.number} ${invoice.customer.name} ${invoice.plan}`.toLowerCase();
      if (!haystack.includes(filters.q.toLowerCase().trim())) {
        return false;
      }
    }
    return true;
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });
}

export async function getDisputes(filters?: { status?: string }) {
  const disputes = await prisma.dispute.findMany({
    include: disputeInclude,
    orderBy: { openedOn: "desc" },
  });

  if (!filters?.status || filters.status === "ALL") {
    return disputes;
  }
  return disputes.filter((dispute) => dispute.status === filters.status);
}

export async function getDispute(id: string) {
  return prisma.dispute.findUnique({
    where: { id },
    include: disputeInclude,
  });
}

export const DISPUTE_COMMENT_PAGE_SIZE = 10;
export const DISPUTE_COMMENT_AUTHOR = "Avery Quinn";

export async function listDisputeComments(disputeId: string, page: number) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true },
  });
  if (!dispute) return null;

  const where = { disputeId };
  const [total, data] = await Promise.all([
    prisma.disputeComment.count({ where }),
    prisma.disputeComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * DISPUTE_COMMENT_PAGE_SIZE,
      take: DISPUTE_COMMENT_PAGE_SIZE,
    }),
  ]);

  return {
    data,
    meta: {
      page,
      total,
      totalPages: Math.ceil(total / DISPUTE_COMMENT_PAGE_SIZE),
    },
  };
}

export async function createDisputeComment(disputeId: string, body: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true },
  });
  if (!dispute) return null;

  return prisma.disputeComment.create({
    data: {
      id: `cmt_${crypto.randomUUID()}`,
      disputeId,
      authorName: DISPUTE_COMMENT_AUTHOR,
      body,
      createdAt: new Date(),
    },
  });
}

export async function deleteDisputeComment(disputeId: string, commentId: string) {
  const comment = await prisma.disputeComment.findFirst({
    where: { id: commentId, disputeId },
  });
  if (!comment) return null;

  await prisma.disputeComment.delete({ where: { id: comment.id } });
  return comment;
}

export async function getOpenDisputeCount() {
  return prisma.dispute.count({
    where: { status: { in: ["OPEN", "NEEDS_REVIEW"] satisfies DisputeStatus[] } },
  });
}

export async function getOpenDisputeNotices() {
  const disputes = await prisma.dispute.findMany({
    where: { status: { in: ["OPEN", "NEEDS_REVIEW"] satisfies DisputeStatus[] } },
    include: { invoice: { include: { customer: true } } },
    orderBy: { openedOn: "desc" },
    take: 8,
  });
  return disputes.map((dispute) => ({
    id: dispute.id,
    customerName: dispute.invoice.customer.name,
    invoiceNumber: dispute.invoice.number,
    status: dispute.status,
  }));
}

export async function getWorkspace() {
  return prisma.workspace.findUniqueOrThrow({ where: { id: "ws_fieldnote" } });
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return ["DRAFT", "OPEN", "PAID", "OVERDUE", "VOID"].includes(value);
}

export function isDisputeStatus(value: string): value is DisputeStatus {
  return ["OPEN", "NEEDS_REVIEW", "ACCEPTED", "DECLINED"].includes(value);
}
