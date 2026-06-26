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
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) { console.log(`  Encontrado: ${sel}`); return { el, frame: page }; }
    }
    for (const frame of page.frames()) {
      for (const sel of selectors) {
        try {
          const el = await frame.$(sel);
          if (el) { console.log(`  Encontrado: ${sel} em iframe`); return { el, frame }; }
        } catch {}
      }
    }
    await sleep(500);
  }
  throw new Error(`Não encontrado: ${selectors.join(', ')}`);
}

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);

  const { el: emailEl, frame: emailFrame } = await findInput(page, ['input[type="email"]', 'input[name="loginfmt"]', 'input[placeholder="Enter email"]']);
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(USERNAME, { delay: 80 });
  for (const sel of ['input[type="submit"]', 'button[type="submit"]']) {
    const btn = await emailFrame.$(sel);
    if (btn) { await btn.click(); break; }
  }
  await sleep(5000);

  const { el: passEl, frame: passFrame } = await findInput(page, ['input[type="password"]', 'input[name="passwd"]', '#i0118']);
  await passEl.click({ clickCount: 3 });
  await passEl.type(PASSWORD, { delay: 80 });
  for (const sel of ['#idSIButton9', 'input[type="submit"]', 'button[type="submit"]']) {
    const btn = await passFrame.$(sel);
    if (btn) { await btn.click(); break; }
  }
  await sleep(5000);

  try {
    const { el: naoBtn } = await findInput(page, ['#idBtn_Back'], 8000);
    await naoBtn.click();
    await sleep(3000);
  } catch {}

  console.log('Aguardando Power BI (25s)...');
  await sleep(25000);
  console.log('Login OK. URL:', page.url());
}

async function capturar(page, info) {
  console.log(`\nPagina ${info.num}: navegando...`);
  await page.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(20000);

  // Esconde TODA a interface do Power BI, deixa só o canvas
  await page.evaluate(() => {
    const seletores = [
      // Barra superior (File, Export, Share...)
      '[class*="topBar"]',
      '[class*="commandBar"]', 
      '[class*="header"]',
      // Barra lateral esquerda (Pages, ícones)
      '[class*="sideNav"]',
      '[class*="leftNav"]',
      '[class*="pageNav"]',
      '[class*="pagesNavigation"]',
      // Painel de páginas
      '.pages-navigation-container',
      '[aria-label="Pages"]',
      // Barra de status inferior
      '[class*="statusBar"]',
      '[class*="footer"]',
      // Nav global esquerda (Home, Browse, etc)
      '[class*="navBar"]',
      'nav',
    ];
    seletores.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.cssText = 'display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;';
      });
    });
    // Expande o canvas para ocupar tela toda
    const canvas = document.querySelector('[class*="canvasFluidLayout"], [class*="reportCanvas"], [class*="visualContainer"]');
    if (canvas) {
      canvas.style.cssText = 'width:100vw!important;height:100vh!important;margin:0!important;padding:0!important;';
    }
  }).catch(() => {});

  await sleep(2000);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
