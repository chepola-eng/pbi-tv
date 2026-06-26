const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const USERNAME = process.env.PBI_USERNAME;
const PASSWORD = process.env.PBI_PASSWORD;
const OUTPUT_DIR = 'docs';

const PAGES = [
  { num: 1, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/305ed7c6846e3540717e?experience=power-bi' },
  { num: 2, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/4ef203305c3a8c0e6bcb?experience=power-bi' },
  { num: 3, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/ad4c9b6fcd6034d4970b?experience=power-bi' },
  { num: 4, url: 'https://app.powerbi.com/groups/me/reports/597128d0-5d21-4c67-9aca-8bda42bb6eb9/7c70eece6cf6b670d205?experience=power-bi' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page) {
  console.log('Abrindo Power BI...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);

  // STEP 1: Tela Power BI - Enter email
  console.log('Aguardando campo de email...');
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.type('input[type="email"]', USERNAME, { delay: 80 });
  await sleep(500);
  await page.click('button[type="submit"], input[type="submit"]');
  console.log('Email enviado.');
  await sleep(4000);

  // STEP 2: Tela Microsoft - Enter password
  console.log('Aguardando campo de senha...');
  await page.waitForSelector('input[name="passwd"]', { timeout: 60000 });
  await sleep(500);
  await page.type('input[name="passwd"]', PASSWORD, { delay: 80 });
  await sleep(500);
  await page.click('#idSIButton9');
  console.log('Senha enviada.');
  await sleep(4000);

  // STEP 3: "Stay signed in?" → clicar No
  console.log('Aguardando Stay signed in...');
  try {
    await page.waitForSelector('#idBtn_Back', { timeout: 10000 });
    await page.click('#idBtn_Back');
    console.log('Clicou em No no Stay signed in.');
    await sleep(3000);
  } catch { console.log('Sem prompt Stay signed in.'); }

  // STEP 4: Aguarda Power BI home carregar completamente
  console.log('Aguardando Power BI home (20s)...');
  await sleep(20000);
  console.log('Login concluído! URL:', page.url());
}

async function capturar(page, info) {
  console.log(`\nPagina ${info.num}: navegando para ${info.url}`);
  // Usa a mesma aba já logada
  await page.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log(`Pagina ${info.num}: aguardando renderização (25s)...`);
  await sleep(25000);

  // Esconde barras de UI do Power BI
  await page.evaluate(() => {
    ['[class*="topBar"]','[class*="statusBar"]','[class*="navBar"]',
     '[data-testid="nav-bar"]', '.logoContainer', '[class*="header"]'
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
    });
  }).catch(() => {});
  await sleep(1000);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, `pagina${info.num}.png`);
  await page.screenshot({ path: out });
  console.log(`Pagina ${info.num}: salva! (${Math.round(fs.statSync(out).size / 1024)}KB)`);
}

(async () => {
  console.log('=== Iniciando captura ===');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  // UMA ÚNICA aba para tudo — login + capturas
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await login(page);

    // Captura cada página na mesma aba (já logada)
    for (const info of PAGES) {
      try {
        await capturar(page, info);
      } catch (e) {
        console.error(`ERRO pagina ${info.num}:`, e.message);
        await page.screenshot({ path: path.join(OUTPUT_DIR, `debug_pagina${info.num}.png`) }).catch(() => {});
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
