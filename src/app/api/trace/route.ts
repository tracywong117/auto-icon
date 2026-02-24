import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const potrace = require("potrace");
// Reach into the internal types of potrace to bypass Jimp
const Potrace = potrace.Potrace;
const Bitmap = require("potrace/lib/types/Bitmap");

export async function POST(req: NextRequest) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
        }

        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // Pre-process with Sharp:
        // 1. Resize
        // 2. Grayscale
        // 3. Blur slightly to merge artifacts
        // 4. Threshold to create binary mask
        // 5. Use .raw() to get the actual pixel bytes!
        const width = 800;
        const height = 800;
        
        const { data, info } = await sharp(imageBuffer)
            .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .greyscale()
            .blur(0.5)
            .threshold(180)
            .raw() // CRITICAL: This ensures we get raw bytes, not a PNG/JPEG buffer
            .toBuffer({ resolveWithObject: true });

        // Create a new Potrace instance
        const potraceInstance = new Potrace({
            turdSize: 40,      // Ignore smaller noise particles
            optTolerance: 0.4,
            threshold: 128     // We already thresholded with Sharp, so 128 is a safe middle ground
        });

        // Manually build the Bitmap from sharp's raw grayscale data
        const bitmap = new Bitmap(info.width, info.height);
        bitmap.data.set(data);

        // Inject the bitmap into the instance
        potraceInstance._luminanceData = bitmap;
        potraceInstance._imageLoaded = true;

        // Generate SVG
        const svgOutput = potraceInstance.getSVG();

        // Ensure the SVG is responsive
        const responsiveSvg = svgOutput
            .replace(/width="(\d+)"/, 'width="100%"')
            .replace(/height="(\d+)"/, 'height="100%"')
            .replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet"');

        return NextResponse.json({ svg: responsiveSvg });

    } catch (error: any) {
        console.error("Error tracing image:", error);
        return NextResponse.json({ error: error.message || "Failed to trace image" }, { status: 500 });
    }
}
