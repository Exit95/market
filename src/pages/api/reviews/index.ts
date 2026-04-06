import type { APIRoute } from "astro";
import { prisma } from "../../../lib/auth";
import { requireAuth, isAuthContext } from "../../../lib/auth-middleware";

// POST: Create a review for a completed deal
export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    const { dealId, rating, comment } = body;

    if (!dealId || !rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "dealId and rating (1-5) required" }), { status: 400 });
    }

    // Verify deal exists, is COMPLETED, and user is buyer or seller
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { review: true },
    });

    if (!deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), { status: 404 });
    }

    if (deal.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Deal must be completed before reviewing" }), { status: 400 });
    }

    if (deal.review) {
      return new Response(JSON.stringify({ error: "Deal already reviewed" }), { status: 400 });
    }

    // Determine reviewer and reviewee
    const isBuyer = deal.buyerId === auth.userId;
    const isSeller = deal.sellerId === auth.userId;

    if (!isBuyer && !isSeller) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
    }

    const revieweeId = isBuyer ? deal.sellerId : deal.buyerId;

    const review = await prisma.review.create({
      data: {
        dealId,
        reviewerId: auth.userId,
        revieweeId,
        rating,
        comment: comment?.trim() || null,
      },
    });

    return new Response(JSON.stringify(review), { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};

// GET: Get reviews for a user
export const GET: APIRoute = async ({ url }) => {
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return new Response(JSON.stringify({ error: "userId required" }), { status: 400 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, listing: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return new Response(JSON.stringify({
      reviews,
      stats: {
        count: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
      },
    }));
  } catch (error) {
    console.error("Review fetch error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
