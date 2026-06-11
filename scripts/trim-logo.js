const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = path.join(__dirname, '..', 'assets', 'brand', 'benaderd-logo-header-light.png');
const outputPath = path.join(__dirname, '..', 'assets', 'brand', 'benaderd-logo-header-tight-light.png');

function rowVisibleCount(data, width, y) {
  let count = 0;
  for (let x = 0; x < width; x += 1) {
    if (data[((width * y + x) << 2) + 3] > 10) count += 1;
  }
  return count;
}

function isBackgroundRow(data, width, y) {
  let opaque = 0;
  for (let x = 0; x < width; x += 1) {
    if (data[((width * y + x) << 2) + 3] > 200) opaque += 1;
  }
  return opaque >= width * 0.9;
}

function isArtifactRow(data, width, y) {
  if (isBackgroundRow(data, width, y)) return true;
  const visible = rowVisibleCount(data, width, y);
  return visible > 0 && visible <= 6;
}

const input = PNG.sync.read(fs.readFileSync(inputPath));
const { width, height, data } = input;

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < height; y += 1) {
  if (isArtifactRow(data, width, y)) continue;

  for (let x = 0; x < width; x += 1) {
    const idx = (width * y + x) << 2;
    if (data[idx + 3] > 10) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < minX || maxY < minY) {
  throw new Error('No visible pixels found in source image.');
}

const pad = 2;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);

const outWidth = maxX - minX + 1;
const outHeight = maxY - minY + 1;
const output = new PNG({ width: outWidth, height: outHeight });

for (let y = 0; y < outHeight; y += 1) {
  for (let x = 0; x < outWidth; x += 1) {
    const srcIdx = ((y + minY) * width + (x + minX)) << 2;
    const dstIdx = (outWidth * y + x) << 2;
    output.data[dstIdx] = data[srcIdx];
    output.data[dstIdx + 1] = data[srcIdx + 1];
    output.data[dstIdx + 2] = data[srcIdx + 2];
    output.data[dstIdx + 3] = data[srcIdx + 3];
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(output));
console.log(`Trimmed ${width}x${height} -> ${outWidth}x${outHeight}`);
console.log(`Saved ${outputPath}`);
