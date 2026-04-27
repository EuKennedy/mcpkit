import pc from 'picocolors';

export const log = {
  info: (msg: string) => console.log(`${pc.cyan('›')} ${msg}`),
  success: (msg: string) => console.log(`${pc.green('✔')} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow('!')} ${msg}`),
  error: (msg: string) => console.error(`${pc.red('✖')} ${msg}`),
  step: (msg: string) => console.log(`  ${pc.dim('…')} ${pc.dim(msg)}`),
  hr: () => console.log(pc.dim('─'.repeat(40))),
  blank: () => console.log(''),
};

export const c = pc;
