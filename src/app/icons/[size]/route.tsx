import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Valid icon sizes for PWA
const VALID_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;

  // Parse size from filename (e.g., "icon-144x144.png" -> 144)
  const sizeMatch = sizeParam.match(/icon-(\d+)x\d+\.png/);
  if (!sizeMatch) {
    return new Response("Invalid icon path", { status: 400 });
  }

  const size = parseInt(sizeMatch[1], 10);

  if (!VALID_SIZES.includes(size)) {
    return new Response("Invalid icon size", { status: 400 });
  }

  // Generate icon with AAPRP branding
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          borderRadius: size > 100 ? "20%" : "15%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          {/* Main "A" letter */}
          <span
            style={{
              fontSize: size * 0.5,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1,
            }}
          >
            A
          </span>
          {/* Subtitle for larger icons */}
          {size >= 192 && (
            <span
              style={{
                fontSize: size * 0.08,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
                marginTop: size * 0.02,
                opacity: 0.9,
              }}
            >
              ANSP
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
