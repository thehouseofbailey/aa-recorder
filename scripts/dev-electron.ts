import { spawn, ChildProcess } from 'child_process';
import { build } from 'esbuild';
import { watch } from 'fs';
import { join } from 'path';

let electronProcess: ChildProcess | null = null;

async function buildMain() {
  console.log('Building main process...');
  
  await build({
    entryPoints: [join('src', 'main', 'main.ts')],
    bundle: true,
    outfile: join('dist', 'main', 'main.js'),
    platform: 'node',
    target: 'node18',
    external: [
      'electron',
      'playwright',
      'playwright-core',
      'chromium-bidi',
      '@playwright/test',
    ],
    format: 'cjs',
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"',
    },
  });

  // Also build preload script
  await build({
    entryPoints: [join('src', 'main', 'preload.ts')],
    bundle: true,
    outfile: join('dist', 'main', 'preload.js'),
    platform: 'node',
    target: 'node18',
    external: ['electron'],
    format: 'cjs',
    sourcemap: true,
  });
  
  console.log('Main process build completed');
}

function startElectron() {
  if (electronProcess) {
    console.log('Killing previous Electron process...');
    electronProcess.kill('SIGTERM');
    electronProcess = null;
  }
  
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npx.cmd' : 'npx';
  
  console.log('Starting Electron...');
  electronProcess = spawn(command, ['electron', '.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1',
    },
    shell: isWindows,
  });

  electronProcess.on('close', (code, signal) => {
    if (code !== null && code !== 0) {
      console.log(`Electron exited with code ${code}`);
    }
    if (signal) {
      console.log(`Electron exited with signal ${signal}`);
    }
    electronProcess = null;
  });
  
  electronProcess.on('error', (error) => {
    console.error('Electron process error:', error);
    electronProcess = null;
  });
}

async function develop() {
  try {
    await buildMain();
    startElectron();

    // Watch for changes in main process files
    const mainPath = join('src', 'main');
    const recorderPath = join('src', 'recorder');
    
    console.log(`Watching ${mainPath} and ${recorderPath} for changes...`);
    
    [mainPath, recorderPath].forEach(watchPath => {
      watch(watchPath, { recursive: true }, async (eventType, filename) => {
        if (filename?.endsWith('.ts')) {
          console.log(`File changed: ${filename} in ${watchPath}`);
          try {
            await buildMain();
            startElectron();
          } catch (error) {
            console.error('Build failed:', error);
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Development setup failed:', error);
    process.exit(1);
  }
}

const cleanup = () => {
  console.log('Cleaning up development environment...');
  if (electronProcess) {
    electronProcess.kill('SIGTERM');
    electronProcess = null;
  }
  process.exit(0);
};

// Handle various exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
if (process.platform === 'win32') {
  process.on('SIGBREAK', cleanup);
}

// Start development
develop().catch(console.error);