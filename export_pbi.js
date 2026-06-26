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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function login(page) {
  console.log('Fazendo login...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 60000 });

  // Email
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.type('input[type="email"]', USERNAME, { delay: 50 });
  await page.click('input[type="submit"]');

  // Senha
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await sleep(1000);
  await page.type('input[type="password"]', PASSWORD, { delay: 50 });
  await page.click('input[type="submit"]');

  // "Manter conectado?" → Não
  try {
    await page.waitForSelector('#idBtn_Back', { timeout: 10000 });
    await page.click('#idBtn_Back');
  } catch {}

  // Aguardar Power BI carregar
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
  console.log('Login realizado!');
}

async function capturarPagina(browser, pageInfo) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080 });

  console.log(`  Página ${pageInfo.num}: abrindo...`);
  await tab.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 90000 });

  // Aguarda o relatório renderizar
  await sleep(8000);

  // Esconde barras do Power BI para screenshot limpo
  await tab.evaluate(() => {
    const hide = [
      '.nav-bar-container',
      '.footer',
      '[class*="topBar"]',
      '[class*="statusBar"]',
    ];
    hide.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
    });
  });

  await sleep(1000);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `pagina${pageInfo.num}.png`);
  await tab.screenshot({ path: outPath, fullPage: false });
  console.log(`  Página ${pageInfo.num}: salva em ${outPath}`);
  await tab.close();
}

(async () => {
  console.log('=== Iniciando captura do Power BI ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await login(page);

    for (const pageInfo of PAGES) {
      try {
        await capturarPagina(browser, pageInfo);
      } catch (e) {
        console.error(`  ERRO página ${pageInfo.num}: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('=== Concluído ===');
})();
