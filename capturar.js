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

async function typeInFrame(page, selector, value) {
  // Tenta na página principal primeiro
  let target = await page.$(selector);
  if (target) {
    await target.click({ clickCount: 3 });
    await target.type(value, { delay: 80 });
    return page;
  }
  // Tenta em cada frame
  for (const frame of page.frames()) {
    try {
      target = await frame.$(selector);
      if (target) {
        await target.click({ clickCount: 3 });
        await target.type(value, { delay: 80 });
        return frame;
      }
    } catch {}
  }
  // Último recurso: injeta via JavaScript em todos os frames
  for (const frame of page.frames()) {
    try {
      const found = await frame.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }, selector, value);
      if (found) {
        console.log(`  Digitado via JS em frame: ${frame.url()}`);
        return frame;
      }
    } catch {}
  }
  throw new Error(`Não conseguiu digitar em: ${selector}`);
}

async function clickInFrame(page, selectors) {
  for (const sel of selectors) {
    // Tenta na página principal
    const el = await page.$(sel);
    if (el) { await el.click(); return; }
    // Tenta nos frames
    for (const frame of page.frames()) {
      try {
        const el2 = await frame.$(sel);
        if (el2) { await el2.click(); return; }
      } catch {}
    }
    // Via JS
    for (const frame of page.frames()) {
      try {
        const found = await frame.evaluate((s) => {
          const el = document.querySelector(s);
          if (el) { el.click(); return true; }
          return false;
        }, sel);
        if (found) return;
      } catch {}
    }
  }
}

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(5000);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s1.png') });
  console.log(`Frames encontrados: ${page.frames().length}`);
  page.frames().forEach((f, i) => console.log(`  Frame ${i}: ${f.url()}`));

  // STEP 1: Email
  console.log('Digitando email...');
  await typeInFrame(page, 'input[type="email"]', USERNAME);
  await sleep(500);
  await clickInFrame(page, ['input[type="submit"]', 'button[type="submit"]', '.submitBtn', '[data-bi-id="submit"]']);
  await sleep(5000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s2.png') });
  console.log('Após email. URL:', page.url());

  // STEP 2: Senha
  console.log('Digitando senha...');
  await typeInFrame(page, 'input[name="passwd"]', PASSWORD);
  await sleep(500);
  await clickInFrame(page, ['#idSIButton9', 'input[type="submit"]', 'button[type="submit"]']);
  await sleep(5000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s3.png') });

  // STEP 3: Stay signed in → No
  try {
    await clickInFrame(page, ['#idBtn_Back']);
    console.log('Clicou em No.');
    await sleep(3000);
  } catch {}

  console.log('Aguardando Power BI (20s)...');
  await sleep(20000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_s4.png') });
  console.log('Login OK. URL:', page.url());
}

async function capturar(page, info) {
  console.log(`\nPagina ${info.num}: abrindo...`);
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
