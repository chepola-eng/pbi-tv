const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const USERNAME = process.env.PBI_USERNAME;
const PASSWORD = process.env.PBI_PASSWORD;
const OUTPUT_DIR = 'docs';

const PAGES = [
  { num: 1, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/305ed7c6846e3540717e' },
  { num: 2, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/4ef203305c3a8c0e6bcb' },
  { num: 3, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/ad4c9b6fcd6034d4970b' },
  { num: 4, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/7c70eece6cf6b670d205' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findInput(page, selectors, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // Tenta na página principal
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) { console.log(`  Encontrado: ${sel} na página principal`); return { el, frame: page }; }
    }
    // Tenta em todos os iframes
    for (const frame of page.frames()) {
      for (const sel of selectors) {
        try {
          const el = await frame.$(sel);
          if (el) { console.log(`  Encontrado: ${sel} em iframe (${frame.url()})`); return { el, frame }; }
        } catch {}
      }
    }
    await sleep(500);
  }
  throw new Error(`Nenhum seletor encontrado: ${selectors.join(', ')}`);
}

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_step1.png') }).catch(() => {});

  // STEP 1: Campo de email (pode estar em iframe)
  console.log('Procurando campo de email...');
  const { el: emailEl, frame: emailFrame } = await findInput(page, [
    'input[type="email"]',
    'input[name="loginfmt"]',
    'input[placeholder="Enter email"]',
    '#email',
  ]);
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(USERNAME, { delay: 80 });
  console.log('Email digitado.');

  // Clica em Submit/Next no mesmo frame
  const submitSels = ['input[type="submit"]', 'button[type="submit"]', '#submitBtn', '.btn-primary', 'button:has-text("Submit")', 'input[value="Submit"]'];
  for (const sel of submitSels) {
    const btn = await emailFrame.$(sel);
    if (btn) { await btn.click(); console.log(`Clicou em: ${sel}`); break; }
  }
  await sleep(5000);
  console.log('URL após email:', page.url());
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_step2.png') }).catch(() => {});

  // STEP 2: Campo de senha
  console.log('Procurando campo de senha...');
  const { el: passEl, frame: passFrame } = await findInput(page, [
    'input[type="password"]',
    'input[name="passwd"]',
    '#i0118',
  ]);
  await passEl.click({ clickCount: 3 });
  await passEl.type(PASSWORD, { delay: 80 });
  console.log('Senha digitada.');

  for (const sel of ['input[type="submit"]', '#idSIButton9', 'button[type="submit"]']) {
    const btn = await passFrame.$(sel);
    if (btn) { await btn.click(); console.log(`Clicou sign in: ${sel}`); break; }
  }
  await sleep(5000);
  console.log('URL após senha:', page.url());
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_step3.png') }).catch(() => {});

  // STEP 3: Manter conectado → Não
  try {
    const { el: naoBtn } = await findInput(page, ['#idBtn_Back'], 8000);
    await naoBtn.click();
    console.log('Clicou em Não');
    await sleep(3000);
  } catch { console.log('Sem prompt de manter conectado.'); }

  console.log('Aguardando Power BI carregar (25s)...');
  await sleep(25000);
  console.log('URL final:', page.url());
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_step4.png') }).catch(() => {});
}

async function capturar(browser, info) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080 });
  console.log(`\nPagina ${info.num}: abrindo...`);
  await tab.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(20000);
  await tab.evaluate(() => {
    ['[class*="topBar"]','[class*="statusBar"]','[class*="navBar"]'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
    });
  }).catch(() => {});
  await sleep(1000);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, `pagina${info.num}.png`);
  await tab.screenshot({ path: out });
  console.log(`Pagina ${info.num}: salva! (${Math.round(fs.statSync(out).size / 1024)}KB)`);
  await tab.close();
}

(async () => {
  console.log('=== Iniciando captura ===');
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
      try { await capturar(browser, info); }
      catch (e) { console.error(`ERRO pagina ${info.num}:`, e.message); }
    }
  } catch (e) {
    console.error('ERRO GERAL:', e.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug_error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
  console.log('=== Concluido ===');
})();
