import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avatars = [
  { input: 'military_drill_serge_080c9dc4.jpg', output: 'military_avatar.webp' },
  { input: 'friendly_gym_coach_a_d8527adf.jpg', output: 'gym_bro_avatar.webp' },
  { input: 'zen_wellness_meditat_f12081ed.jpg', output: 'zen_avatar.webp' },
  { input: 'clinical_professiona_485d9be0.jpg', output: 'clinical_avatar.webp' },
  { input: 'playful_sarcastic_ai_b247c6b4.jpg', output: 'dark_humour_avatar.webp' }
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
