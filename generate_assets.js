const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets/images');
const outputFile = path.join(__dirname, 'src/constants/Base64Assets.ts');

const files = [
    { name: 'logo.png', varName: 'APP_LOGO_BASE64', mime: 'image/png' },
    { name: 'vu-cover-page-logo.png', varName: 'VU_LOGO_BASE64', mime: 'image/png' },
    { name: 'cse-departmet-logo.jpg', varName: 'DEPT_LOGO_BASE64', mime: 'image/jpeg' }
];

let fileContent = '// This file is auto-generated. Do not edit manually.\n\n';

files.forEach(file => {
    try {
        const filePath = path.join(assetsDir, file.name);
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            fileContent += `export const ${file.varName} = "data:${file.mime};base64,${base64}";\n\n`;
            console.log(`Converted ${file.name}`);
        } else {
            console.error(`File not found: ${filePath}`);
            // Fallback for missing files to avoid build crash
             fileContent += `export const ${file.varName} = "";\n\n`;
        }
    } catch (e) {
        console.error(`Error processing ${file.name}:`, e);
    }
});

fs.writeFileSync(outputFile, fileContent);
console.log(`Assets written to ${outputFile}`);
