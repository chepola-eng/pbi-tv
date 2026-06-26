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

async function login(page) {
  // Faz login na URL principal do Power BI para estabelecer sessão
  console.log('Abrindo Power BI para login...');
  await page.goto('https://app.powerbi.com', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);

  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.type('input[type="email"]', USERNAME, { delay: 80 });
  await sleep(500);
  await page.click('button[type="submit"], input[type="submit"]');
  await sleep(4000);

  await page.waitForSelector('input[name="passwd"]', { timeout: 60000 });
  await sleep(500);
  await page.type('input[name="passwd"]', PASSWORD, { delay: 80 });
  await sleep(500);
  await page.click('#idSIButton9');
  await sleep(4000);

  try {
    await page.waitForSelector('#idBtn_Back', { timeout: 10000 });
    await page.click('#idBtn_Back');
    await sleep(3000);
  } catch {}

  console.log('Aguardando Power BI carregar (20s)...');
  await sleep(20000);
  console.log('Login OK. URL:', page.url());
}

async function capturar(page, info) {
  console.log(`\nPagina ${info.num}: navegando para reportEmbed...`);
  // Agora navega para a URL embed (sem interface, só o visual)
  await page.goto(info.url, { waitUntil: 'networkidle2', timeout: 120000 });
  console.log(`Pagina ${info.num}: aguardando renderização (20s)...`);
  await sleep(20000);

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

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await login(page);
    for (const info of PAGES) {
      try { await capturar(page, info); }
      catch (e) {
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
