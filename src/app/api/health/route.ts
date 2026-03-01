/**
 * Health check endpoint used by the connectivity monitor
 * to detect online/offline state via periodic HEAD requests.
 */

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function GET() {
  return Response.json({ status: "ok" });
}
