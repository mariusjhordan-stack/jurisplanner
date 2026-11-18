import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createInterface } from 'node:readline';
import { createPool, initializeDatabase } from '../server/db.js';

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Ejecuta este comando desde una terminal interactiva.'));
  }

  process.stdout.write(prompt);
  return new Promise((resolveInput, rejectInput) => {
    let value = '';
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          cleanup();
          rejectInput(new Error('Operación cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolveInput(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
        } else if (character >= ' ') {
          value += character;
        }
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const username = (await prompt.question('Usuario: ')).trim().toLowerCase();
prompt.close();
if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
  throw new Error('El usuario debe tener entre 3 y 100 caracteres: letras, números, punto, guion o guion bajo.');
}

const password = await readHidden('Contraseña (mínimo 12 caracteres, entrada oculta): ');
const confirmation = await readHidden('Repite la contraseña: ');
if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
if (Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('La contraseña debe ocupar entre 12 y 72 bytes UTF-8.');
}

const db = createPool();
try {
  await initializeDatabase(db);
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
  console.log(`Cuenta "${username}" creada. No se guardó la contraseña en texto plano.`);
} finally {
  await db.end();
}
