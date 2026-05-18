import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloudinary — Signed direct upload
 *
 * Flow:
 *  1. Client POST here. We auth-check + signe une requête timestampée.
 *  2. We return { signature, timestamp, apiKey, cloudName, folder } au client.
 *  3. Client POST le file directement vers api.cloudinary.com/v1_1/{cloudName}/image/upload
 *     avec la signature (pas de proxy par notre serveur).
 *  4. Cloudinary répond avec `secure_url` → stocké en DB.
 *
 * Required env vars:
 *  - CLOUDINARY_CLOUD_NAME
 *  - CLOUDINARY_API_KEY
 *  - CLOUDINARY_API_SECRET
 *
 * Si env absente, renvoie 503 — le client garde le fallback "coller une URL".
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: "Cloudinary non configuré côté serveur.",
        missing: [
          !cloudName && "CLOUDINARY_CLOUD_NAME",
          !apiKey && "CLOUDINARY_API_KEY",
          !apiSecret && "CLOUDINARY_API_SECRET",
        ].filter(Boolean),
      },
      { status: 503 },
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  // Organisation : tous les uploads atterrissent dans /lrh/. Permet de cleaner
  // facilement côté Cloudinary dashboard si on veut filtrer ou tout supprimer.
  const folder = "lrh";
  const timestamp = Math.round(Date.now() / 1000);

  // IMPORTANT : signer exactement les params qu'on enverra côté client (sauf
  // `file`, `api_key`, `signature` qui sont gérés à part). Si on ajoute des
  // params custom (tags, context, etc.), ils doivent figurer ici ET être
  // envoyés à l'upload, sinon Cloudinary rejette la signature.
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  });
}
