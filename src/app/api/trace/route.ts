import { NextRequest, NextResponse } from "next/server";
import { trace } from "@pwa-manifest/potrace";
import sharp from "sharp";

export async function POST(req: NextRequest) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
        }

        // Decode the base64 image into a Buffer
        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // Use Sharp to read the dimensions and ensure it's a valid format for potrace
        const metadata = await sharp(imageBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            throw new Error("Could not determine image dimensions.");
        }

        // We can use sharp to ensure high-contrast or standard formats before tracing if needed, 
        // but passing the buffer directly mostly works.
        const svgOutput = trace(imageBuffer, metadata.width, metadata.height);

        // Some simple cleanup of the Potrace output if needed:
        // E.g., removing fixed width/height so it scales properly in our canvas
        const scalableSvgOptions = svgOutput
            .replace(/width="[^"]+"/, 'width="100%"')
            .replace(/height="[^"]+"/, 'height="100%"');

        return NextResponse.json({ svg: scalableSvgOptions });

    } catch (error: any) {
        console.error("Error tracing image:", error);
        return NextResponse.json({ error: error.message || "Failed to trace image" }, { status: 500 });
    }
}
