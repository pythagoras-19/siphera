#!/usr/bin/env node

/**
 * Script to generate PNG favicons from SVG
 * 
 * To use this script:
 * 1. Install sharp: npm install sharp
 * 2. Run: node scripts/generate-favicons.js
 * 
 * This will generate favicon-16x16.png and favicon-32x32.png
 * from the SVG favicon in the public folder.
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
  require('sharp');
} catch (error) {
  console.log('❌ Sharp is not installed. Installing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install sharp', { stdio: 'inherit' });
    console.log('✅ Sharp installed successfully!');
  } catch (installError) {
    console.error('❌ Failed to install sharp. Please run: npm install sharp');
    process.exit(1);
  }
}

const sharp = require('sharp');

async function generateFavicons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'favicon.svg');
  
  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ favicon.svg not found in public directory');
    process.exit(1);
  }

  const sizes = [16, 32, 48];
  
  console.log('🎨 Generating favicons from SVG...');
  
  try {
    for (const size of sizes) {
      const outputPath = path.join(publicDir, `favicon-${size}x${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated favicon-${size}x${size}.png`);
    }
    
    console.log('\n🎉 All favicons generated successfully!');
    console.log('📁 Files created in public/ directory:');
    sizes.forEach(size => {
      console.log(`   - favicon-${size}x${size}.png`);
    });
    
  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons(); 