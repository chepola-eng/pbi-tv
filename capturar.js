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

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  console.log('URL inicial:', page.url());

  // PASSO 1: Tela do Power BI com "Enter email"
  console.log('Aguardando campo de email do Power BI...');
  await page.waitForSelector('input[type="email"], input[name="loginfmt"]', { timeout: 60000 });
  await sleep(1000);

  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="loginfmt"]');
  await emailInput.click();
  await emailInput.type(USERNAME, { delay: 80 });
  console.log('Email digitado:', USERNAME);
  await sleep(500);

  // Clica no botão Submit/Next
  const submitBtn = await page.$('input[type="submit"], button[type="submit"], .btn-primary, #submitBtn');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicou em Submit');
  } else {
    await page.keyboard.press('Enter');
    console.log('Pressionou Enter');
  }
  await sleep(5000);
  console.log('URL após email:', page.url());

  // PASSO 2: Tela de senha da Microsoft
  console.log('Aguardando campo de senha...');
  await page.waitForSelector('input[type="password"], input[name="passwd"]', { timeout: 60000 });
  await sleep(1000);

  const passInput = await page.$('input[name="passwd"]') || await page.$('input[type="password"]');
  await passInput.click();
  await passInput.type(PASSWORD, { delay: 80 });
  console.log('Senha digitada.');
  await sleep(500);

  const signInBtn = await page.$('input[type="submit"], button[type="submit"], #idSIButton9');
  if (signInBtn) {
    await signInBtn.click();
    console.log('Clicou em Sign In');
  } else {
    await page.keyboard.press('Enter');
  }
  await sleep(5000);
  console.log('URL após senha:', page.url());

  // PASSO 3: "Manter conectado?" → Não
  try {
    const naoBtn = await page.$('#idBtn_Back');
    if (naoBtn) {
      await naoBtn.click();
      console.log('Clicou em Não no manter conectado');
      await sleep(3000);
    }
  } catch {}

  // PASSO 4: Aguarda Power BI carregar de verdade
  console.log('Aguardando Power BI carregar (20s)...');
  await sleep(20000);
  console.log('URL final:', page.url());
}

async function capturar(browser, info) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080 });
  console.log(`\nPagina ${info.num}: abrindo ${info.url}`);
  await tab.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log(`Pagina ${info.num}: aguardando 20s para renderizar...`);
  await sleep(20000);

  // Esconde elementos de UI do Power BI
  await tab.evaluate(() => {
    ['[class*="topBar"]','[class*="statusBar"]','[class*="navBar"]','.logoContainer'].forEach(sel => {
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
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug.png') }).catch(() => {});
    console.log('Debug screenshot salvo em docs/debug.png');
  } finally {
    await browser.close();
  }
  console.log('=== Concluido ===');
})();
