const potrace = require('potrace');
const sharp = require('sharp');
const fs = require('fs');

async function test() {
    try {
        // Create a dummy 100x100 white image with a black square
        const buffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
        .composite([{
            input: Buffer.from('<svg><rect x="25" y="25" width="50" height="50" fill="black" /></svg>'),
            top: 0,
            left: 0
        }])
        .png()
        .toBuffer();

        console.log("Buffer created");

        const processed = await sharp(buffer)
            .greyscale()
            .threshold(128)
            .toBuffer();
        
        console.log("Image processed");

        potrace.trace(processed, (err, svg) => {
            if (err) {
                console.error("Trace error:", err);
            } else {
                console.log("SVG generated, length:", svg.length);
            }
        });
    } catch (e) {
        console.error("Catch error:", e);
    }
}

test();
