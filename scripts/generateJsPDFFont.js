const fs = require('fs');
const path = require('path');

// Простая функция для создания font-файла в формате jsPDF
function convertTTFtoJsPDFFormat(ttfPath, fontName, style) {
  const ttfData = fs.readFileSync(ttfPath);
  const base64 = ttfData.toString('base64');

  // Создаем модуль в формате, который понимает jsPDF
  const fontModule = `(function (jsPDFAPI) {
  "use strict";
  var font = "${base64}";
  jsPDFAPI.addFileToVFS("${fontName}-${style}.ttf", font);
  jsPDFAPI.addFont("${fontName}-${style}.ttf", "${fontName}", "${style}");
})(jsPDF.API);
`;

  return fontModule;
}

// Конвертируем Regular
const regularModule = convertTTFtoJsPDFFormat(
  path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'),
  'Roboto',
  'normal'
);

const regularOutputPath = path.join(process.cwd(), 'src', 'lib', 'fonts', 'Roboto-normal.js');
fs.writeFileSync(regularOutputPath, regularModule);
console.log('✅ Roboto-normal.js created!');

// Конвертируем Bold
const boldModule = convertTTFtoJsPDFFormat(
  path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf'),
  'Roboto',
  'bold'
);

const boldOutputPath = path.join(process.cwd(), 'src', 'lib', 'fonts', 'Roboto-bold.js');
fs.writeFileSync(boldOutputPath, boldModule);
console.log('✅ Roboto-bold.js created!');
