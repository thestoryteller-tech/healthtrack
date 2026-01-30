import * as esbuild from 'esbuild';
import { gzipSync } from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

async function build() {
  const distDir = path.join(__dirname, 'dist');
  const outfile = path.join(distDir, 'healthtrack.min.js');

  // Build minified version
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    minify: true,
    target: ['es2015'],
    format: 'iife',
    globalName: 'HealthTrackModule',
    outfile,
    footer: {
      js: '// HealthTrack Pro SDK v1.0.0 - HIPAA Compliant Tracking',
    },
  });

  // Calculate sizes
  const content = fs.readFileSync(outfile);
  const gzipped = gzipSync(content);

  console.log('SDK Build Complete:');
  console.log(`  Original: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`  Gzipped:  ${(gzipped.length / 1024).toFixed(2)} KB`);

  if (gzipped.length > 10 * 1024) {
    console.warn('  WARNING: Gzipped size exceeds 10KB target!');
  } else {
    console.log('  ✓ Under 10KB gzipped target');
  }

  // Also create a non-minified version for debugging
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    minify: false,
    target: ['es2015'],
    format: 'iife',
    globalName: 'HealthTrackModule',
    outfile: path.join(distDir, 'healthtrack.js'),
  });

  console.log('  ✓ Debug build created');

  // Generate TypeScript declarations
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: false,
    outfile: path.join(distDir, 'index.d.ts'),
    format: 'esm',
    // This won't actually generate .d.ts, we'll create it manually
  });

  const publicSdkDir = path.join(__dirname, '..', '..', 'public', 'sdk');
  fs.mkdirSync(publicSdkDir, { recursive: true });
  fs.cpSync(distDir, publicSdkDir, { recursive: true, force: true });
  console.log('  ✓ Copied SDK dist to public/sdk');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
