import { spawnSync } from 'node:child_process';

const steps = ['lint', 'test:unit', 'validate:city', 'build'];

for (const step of steps) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run ${step}`]
    : ['run', step];
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
