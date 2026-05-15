import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Cloudflare Images — Direct Creator Upload
 *
 * Flow:
 *  1. Client POST here. We auth-check and call Cloudflare's API.
 *  2. We return a one-time `uploadURL` to the client.
 *  3. Client uploads the file directly to that URL (no proxy through us).
 *  4. Client uses the returned `deliveryURL` as the final image URL stored in DB.
 *
 * Required env vars:
 *  - CLOUDFLARE_ACCOUNT_ID
 *  - CLOUDFLARE_IMAGES_TOKEN  (API token with `Cloudflare Images: Edit`)
 *  - CLOUDFLARE_IMAGES_ACCOUNT_HASH  (visible on dash > Images > Delivery URL)
 *
 * If env is missing, returns 503 — the client falls back to URL-paste only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_IMAGES_TOKEN;
  const accountHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;

  if (!accountId || !token || !accountHash) {
    return NextResponse.json(
      {
        error: "Cloudflare Images non configuré côté serveur.",
        missing: [
          !accountId && "CLOUDFLARE_ACCOUNT_ID",
          !token && "CLOUDFLARE_IMAGES_TOKEN",
          !accountHash && "CLOUDFLARE_IMAGES_ACCOUNT_HASH",
        ].filter(Boolean),
      },
      { status: 503 },
    );
  }

  // Cloudflare requires a multipart body even when empty for direct_upload v2
  const formData = new FormData();
  // Optional: tag with uploader id for traceability in Cloudflare dashboard
  formData.append("metadata", JSON.stringify({ uploadedBy: session.user.id }));
  // Allow signed URLs to be off — default public delivery
  formData.append("requireSignedURLs", "false");

  let cfRes: Response;
  try {
    cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  } catch (e) {
    return NextResponse.json({ error: "Impossible de contacter Cloudflare." }, { status: 502 });
  }

  if (!cfRes.ok) {
    const text = await cfRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Cloudflare a refusé la requête (${cfRes.status}). ${text.slice(0, 240)}` },
      { status: 502 },
    );
  }

  const data = (await cfRes.json()) as {
    success: boolean;
    result?: { id: string; uploadURL: string };
    errors?: unknown[];
  };

  if (!data.success || !data.result) {
    return NextResponse.json(
      { error: "Réponse Cloudflare inattendue.", details: data.errors },
      { status: 502 },
    );
  }

  return NextResponse.json({
    uploadURL: data.result.uploadURL,
    imageId: data.result.id,
    deliveryURL: `https://imagedelivery.net/${accountHash}/${data.result.id}/public`,
  });
}
