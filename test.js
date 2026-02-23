import { GoogleGenAI } from '@google/genai';
require('dotenv').config();

const ai = new GoogleGenAI({
    apiKey: process.env.VERTEX_AI_API_KEY,
});

async function main() {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: 'a simple cute cat',
        config: {
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K",
                outputMimeType: "image/png",
            }
        }
    });

    const candidates = response.candidates;
    console.log("Response:", JSON.stringify(candidates, null, 2));
}

main().catch(console.error);
