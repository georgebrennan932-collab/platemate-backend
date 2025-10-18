import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avatars = [
  { input: 'stern_serious_milita_37e162a0.jpg', output: 'military_avatar.webp' },
  { input: 'friendly_energetic_g_44b179d2.jpg', output: 'gym_bro_avatar.webp' },
  { input: 'calm_peaceful_zen_me_9a6381ca.jpg', output: 'zen_avatar.webp' },
  { input: 'professional_clinica_1f7fa67b.jpg', output: 'clinical_avatar.webp' },
  { input: 'playful_smirking_fun_115ee28e.jpg', output: 'dark_humour_avatar.webp' }
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
