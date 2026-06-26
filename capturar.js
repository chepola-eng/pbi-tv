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
  console.log('Abrindo Microsoft login...');
  await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=871c010f-5e61-4fb1-83ac-98610a7e9110&response_type=code&redirect_uri=https://app.powerbi.com/&scope=openid+profile', 
    { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  console.log('URL:', page.url());

  console.log('Aguardando campo email...');
  await page.waitForSelector('input[name="loginfmt"]', { timeout: 60000 });
  await page.type('input[name="loginfmt"]', USERNAME, { delay: 80 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(3000);
  console.log('Email enviado. URL:', page.url());

  console.log('Aguardando campo senha...');
  await page.waitForSelector('input[name="passwd"]', { timeout: 60000 });
  await sleep(1000);
  await page.type('input[name="passwd"]', PASSWORD, { delay: 80 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(4000);
  console.log('Senha enviada. URL:', page.url());

  // "Manter conectado?" → Não
  try {
    await page.waitForSelector('#idBtn_Back', { timeout: 8000 });
    await page.click('#idBtn_Back');
    console.log('Clicou em Nao no Manter conectado');
    await sleep(3000);
  } catch { console.log('Sem prompt de manter conectado.'); }

  console.log('Login OK. URL final:', page.url());
}

async function capturar(browser, info) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080 });
  console.log(`Pagina ${info.num}: abrindo...`);
  await tab.goto(info.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log(`Pagina ${info.num}: aguardando 15s para renderizar...`);
  await sleep(15000);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, `pagina${info.num}.png`);
  await tab.screenshot({ path: out });
  console.log(`Pagina ${info.num}: salva! (${Math.round(fs.statSync(out).size/1024)}KB)`);
  await tab.close();
}

(async () => {
  console.log('=== Iniciando ===');
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
      catch(e) { console.error(`ERRO pagina ${info.num}:`, e.message); }
    }
  } catch(e) {
    console.error('ERRO GERAL:', e.message);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug.png') }).catch(()=>{});
    console.log('Screenshot de debug salvo em docs/debug.png');
  } finally {
    await browser.close();
  }
  console.log('=== Concluido ===');
})();
