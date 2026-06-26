const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const USERNAME = process.env.PBI_USERNAME;
const PASSWORD = process.env.PBI_PASSWORD;
const OUTPUT_DIR = 'docs';

const PAGES = [
  { num: 1, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83&pageName=305ed7c6846e3540717e' },
  { num: 2, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83&pageName=4ef203305c3a8c0e6bcb' },
  { num: 3, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83&pageName=ad4c9b6fcd6034d4970b' },
  { num: 4, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83&pageName=7c70eece6cf6b670d205' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Busca um seletor em todos os frames da página
async function findInFrames(page, selector, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const frame of page.frames()) {
      try {
        const el = await frame.$(selector);
        if (el) return { el, frame };
      } catch {}
    }
    await sleep(500);
  }
  throw new Error(`Seletor não encontrado em nenhum frame: ${selector}`);
}

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s1.png') });

  // STEP 1: campo email (pode estar em iframe)
  console.log('Buscando campo email em todos os frames...');
  const { el: emailEl, frame: f1 } = await findInFrames(page, 'input[type="email"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(USERNAME, { delay: 80 });
  console.log('Email digitado.');

  // Clica em Submit no mesmo frame
  const submitEl = await f1.$('input[type="submit"], button[type="submit"]');
  if (submitEl) await submitEl.click();
  else await emailEl.press('Enter');
  await sleep(5000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s2.png') });

  // STEP 2: campo senha
  console.log('Buscando campo senha em todos os frames...');
  const { el: passEl, frame: f2 } = await findInFrames(page, 'input[name="passwd"]');
  await passEl.click({ clickCount: 3 });
  await passEl.type(PASSWORD, { delay: 80 });
  console.log('Senha digitada.');

  const signinEl = await f2.$('#idSIButton9, input[type="submit"], button[type="submit"]');
  if (signinEl) await signinEl.click();
  else await passEl.press('Enter');
  await sleep(5000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s3.png') });

  // STEP 3: Stay signed in → No
  try {
    const { el: noBtn } = await findInFrames(page, '#idBtn_Back', 10000);
    await noBtn.click();
    console.log('Clicou em No.');
    await sleep(3000);
  } catch { console.log('Sem Stay signed in.'); }

  console.log('Aguardando Power BI (20s)...');
  await sleep(20000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s4.png') });
  console.log('Login OK. URL:', page.url());
}

async function capturar(page, info) {
  console.log(`\nPagina ${info.num}: abrindo embed...`);
  await page.goto(info.url, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(20000);
  const out = path.join(OUTPUT_DIR, `pagina${info.num}.png`);
  await page.screenshot({ path: out });
  console.log(`Pagina ${info.num}: salva! (${Math.round(fs.statSync(out).size / 1024)}KB)`);
}

(async () => {
  console.log('=== Iniciando ===');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  try {
    await login(page);
    for (const info of PAGES) {
      try { await capturar(page, info); }
      catch (e) {
        console.error(`ERRO pagina ${info.num}:`, e.message);
        await page.screenshot({ path: path.join(OUTPUT_DIR, `debug_p${info.num}.png`) }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('ERRO GERAL:', e.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
  console.log('=== Concluido ===');
})();
