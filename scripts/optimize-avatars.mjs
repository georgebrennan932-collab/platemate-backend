import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avatars = [
  { input: 'futuristic_female_ai_dfb0d9ca.jpg', output: 'military_avatar.webp' },
  { input: 'futuristic_female_ai_beb432ef.jpg', output: 'gym_bro_avatar.webp' },
  { input: 'futuristic_female_ai_42e22d97.jpg', output: 'zen_avatar.webp' },
  { input: 'futuristic_female_ai_151d1a61.jpg', output: 'clinical_avatar.webp' },
  { input: 'futuristic_female_ai_a70ff4a5.jpg', output: 'dark_humour_avatar.webp' }
];

const sourceDir = join(__dirname, '..', 'attached_assets', 'stock_images');
const outputDir = join(__dirname, '..', 'attached_assets', 'avatars');

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log('🔄 Optimizing avatar images...\n');

for (const avatar of avatars) {
  const inputPath = join(sourceDir, avatar.input);
  const outputPath = join(outputDir, avatar.output);
  
  try {
    await sharp(inputPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    console.log(`✅ ${avatar.output} created`);
  } catch (error) {
    console.error(`❌ Failed to process ${avatar.input}:`, error.message);
  }
}

console.log('\n✨ Avatar optimization complete!');
