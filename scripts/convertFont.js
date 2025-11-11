const fs = require('fs');
const path = require('path');

// Конвертируем Regular
const regularPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
const regularBuffer = fs.readFileSync(regularPath);
const regularBase64 = regularBuffer.toString('base64');

const regularData = {
  name: 'Roboto-Regular',
  data: regularBase64
};

const regularOutputPath = path.join(process.cwd(), 'src', 'lib', 'fonts', 'roboto-base64.json');
fs.mkdirSync(path.dirname(regularOutputPath), { recursive: true });
fs.writeFileSync(regularOutputPath, JSON.stringify(regularData, null, 2));

console.log('✅ Regular font converted successfully!');
console.log(`📁 Output: ${regularOutputPath}`);
console.log(`📊 Size: ${(regularBase64.length / 1024).toFixed(2)} KB`);

// Конвертируем Bold
const boldPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');
const boldBuffer = fs.readFileSync(boldPath);
const boldBase64 = boldBuffer.toString('base64');

const boldData = {
  name: 'Roboto-Bold',
  data: boldBase64
};

const boldOutputPath = path.join(process.cwd(), 'src', 'lib', 'fonts', 'roboto-bold-base64.json');
fs.writeFileSync(boldOutputPath, JSON.stringify(boldData, null, 2));

console.log('✅ Bold font converted successfully!');
console.log(`📁 Output: ${boldOutputPath}`);
console.log(`📊 Size: ${(boldBase64.length / 1024).toFixed(2)} KB`);
