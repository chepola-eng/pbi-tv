const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const USERNAME = process.env.PBI_USERNAME;
const PASSWORD = process.env.PBI_PASSWORD;
const OUTPUT_DIR = 'docs';

const PAGES = [
  { num: 1, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83' },
  { num: 2, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83' },
  { num: 3, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83' },
  { num: 4, url: 'https://app.powerbi.com/reportEmbed?reportId=597128d0-5d21-4c67-9aca-8bda42bb6eb9&autoAuth=true&ctid=c84da54b-b54a-4c5c-abe1-f6a8b87afa83' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page) {
  console.log('Abrindo Power BI...');
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
  console.log(`\nPagina ${info.num}: navegando...`);
  await page.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(20000);

  // Ativa modo Focus/Fullscreen via URL com parâmetros
  // Esconde TUDO que não é o visual do dashboard
  await page.evaluate(() => {
    // Remove barras superiores, inferiores e laterais do Power BI
    const seletores = [
      '[class*="topBar"]',
      '[class*="statusBar"]', 
      '[class*="navBar"]',
      '[class*="header"]',
      '[data-testid="nav-bar"]',
      '.logoContainer',
      '[class*="breadcrumb"]',
      '[class*="actionBar"]',
      '[class*="toolbar"]',
      // Barra laranja de notificação no topo
      '[class*="notification"]',
      '[class*="banner"]',
    ];
    seletores.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      });
    });
  }).catch(() => {});

  await sleep(1000);

  // Encontra o elemento do canvas do relatório para recortar só ele
  const clip = await page.evaluate(() => {
    // Tenta encontrar o container principal do relatório
    const candidates = [
      '[class*="reportCanvas"]',
      '[class*="canvasArea"]', 
      '[class*="reportPage"]',
      '[class*="visualContainer"]',
      'iframe[title*="Power BI"]',
      '.report-canvas',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) {
          return { x: r.x, y: r.y, width: r.width, height: r.height, sel };
        }
      }
    }
    return null;
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, `pagina${info.num}.png`);

  if (clip && clip.width > 100) {
    console.log(`  Recortando elemento: ${clip.sel} (${Math.round(clip.width)}x${Math.round(clip.height)})`);
    await page.screenshot({ 
      path: out, 
      clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height }
    });
  } else {
    console.log('  Elemento não encontrado, tirando screenshot completo');
    await page.screenshot({ path: out });
  }

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
