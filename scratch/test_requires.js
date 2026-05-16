const start = Date.now();
console.log("Starting require test...");

try {
    console.log("Loading @google/generative-ai...");
    require("@google/generative-ai");
    console.log("Loaded @google/generative-ai in", Date.now() - start, "ms");
} catch (e) {
    console.error("Failed to load @google/generative-ai:", e);
}

const t1 = Date.now();
try {
    console.log("Loading tesseract.js...");
    require("tesseract.js");
    console.log("Loaded tesseract.js in", Date.now() - t1, "ms");
} catch (e) {
    console.error("Failed to load tesseract.js:", e);
}

const t2 = Date.now();
try {
    console.log("Loading sharp...");
    require("sharp");
    console.log("Loaded sharp in", Date.now() - t2, "ms");
} catch (e) {
    console.error("Failed to load sharp:", e);
}

console.log("Total time:", Date.now() - start, "ms");
