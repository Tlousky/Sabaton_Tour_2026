const fs = require('fs');
const path = require('path');

const filepath = "C:\\Users\\משתמש\\.gemini\\antigravity\\brain\\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\\.system_generated\\steps\\3\\content.md";

if (!fs.existsSync(filepath)) {
    console.log("File not found");
    process.exit(1);
}

const html = fs.readFileSync(filepath, 'utf8');
const lines = html.split('\n');

console.log("Total lines:", lines.length);

// Let's do a search for 2026 and Nov/Dec
let count = 0;
lines.forEach((line, idx) => {
    if (line.includes('2026') && (line.includes('Nov') || line.includes('Dec') || line.includes('November') || line.includes('December'))) {
        count++;
        console.log(`Match ${count} at Line ${idx}:`);
        const start = Math.max(0, idx - 4);
        const end = Math.min(lines.length, idx + 5);
        for (let i = start; i < end; i++) {
            console.log(`  ${i}: ${lines[i].trim().substring(0, 150)}`);
        }
        console.log("-".repeat(40));
    }
});
