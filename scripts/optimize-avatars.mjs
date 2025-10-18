import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avatars = [
  { input: 'file_00000000a01461f5975c7a7c6ff90120_1760812097908.png', output: 'military_avatar.webp' },
  { input: 'file_00000000b9a4622fa37801fc41083357_1760812260379.png', output: 'gym_bro_avatar.webp' },
  { input: 'file_000000001888620cbe8aec0b744d9d1a_1760812314128.png', output: 'zen_avatar.webp' },
  { input: 'file_00000000063061f5a5197fd65400dd79_1760812500541.png', output: 'clinical_avatar.webp' },
  { input: 'file_00000000488061f5820936f457e21d83_1760812601047.png', output: 'dark_humour_avatar.webp' }
];

const sourceDir = join(__dirname, '..', 'attached_assets');
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
