import { GoogleGenAI } from '@google/genai';

async function main() {
    const ai = new GoogleGenAI({
        vertexai: {
            location: 'us-central1'
        }
    });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: 'a simple cute cat',
        config: {
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K",
            }
        }
    });

    const candidates = response.candidates;
    console.log("Response:", JSON.stringify(candidates, null, 2));
}

main().catch(console.error);
