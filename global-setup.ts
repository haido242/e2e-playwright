import { chromium, FullConfig } from '@playwright/test';
import { testCredentials } from './tests/helpers/credentials';

async function globalSetup(config: FullConfig) {
  console.log('🔐 Setting up authentication...');

  // Kiểm tra env variable TEST_PROJECTS để xác định project nào cần login
  // Ví dụ: TEST_PROJECTS=diginotes hoặc TEST_PROJECTS=tpa,pvi
  const testProjects = process.env.TEST_PROJECTS?.toLowerCase().split(',').map(p => p.trim()) || [];
  
  if (testProjects.length > 0) {
    console.log(`Login only for projects: ${testProjects.join(', ')}`);
  } else {
    console.log('TEST_PROJECTS not set - will login for all configured projects');
  }

  // Xác định projects nào cần login
  const needsTPA = testProjects.length === 0 || testProjects.some(p => p.includes('tpa'));
  const needsPVI = testProjects.length === 0 || testProjects.some(p => p.includes('pvi'));
  const needsDiginotes = testProjects.length === 0 || testProjects.some(p => p.includes('diginotes'));
  const needsDocbase = testProjects.length === 0 || testProjects.some(p => p.includes('docbase'));

  // TPA Login (chỉ khi project TPA được chạy)
  if (needsTPA && process.env.TPA_TEST_EMAIL && process.env.TPA_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.TPA_BASE_URL || 'http://localhost:3000';
    console.log(`Logging in to TPA at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', testCredentials.tpa.email);
    await page.fill('#password', testCredentials.tpa.password);
    await page.click('button[type=submit]');

    // Đợi navigation sau khi login
    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ TPA login successful');

    // Lưu storage state
    await context.storageState({ path: '.auth/tpa-user.json' });
    await browser.close();
  }

  // PVI Login (chỉ khi project PVI được chạy)
  if (needsPVI && process.env.PVI_TEST_EMAIL && process.env.PVI_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.PVI_BASE_URL || 'http://localhost:3001';
    console.log(`Logging in to PVI at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', testCredentials.pvi.email);
    await page.fill('#password', testCredentials.pvi.password);
    await page.click('button[type=submit]');

    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ PVI login successful');

    await context.storageState({ path: '.auth/pvi-user.json' });
    await browser.close();
  }

  // Diginotes Login (chỉ khi project Diginotes được chạy)
  if (needsDiginotes && process.env.DIGINOTES_TEST_EMAIL && process.env.DIGINOTES_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.DIGINOTES_BASE_URL || 'http://localhost:3000';
    console.log(`Logging in to Diginotes at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#username', testCredentials.diginotes.email);
    await page.fill('#password', testCredentials.diginotes.password);
    await page.click('button[type=submit]');

    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ Diginotes login successful');

    await context.storageState({ path: '.auth/diginotes-user.json' });
    await browser.close();
  }

  // Docbase Login (chỉ khi project Docbase được chạy)
  if (needsDocbase && process.env.DOCBASE_TEST_EMAIL && process.env.DOCBASE_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.DOCBASE_BASE_URL || 'http://localhost:3000';
    console.log(`Logging in to Docbase at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', testCredentials.docbase.email);
    await page.fill('#password', testCredentials.docbase.password);
    await page.click('button[type=submit]');

    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ Docbase login successful');

    await context.storageState({ path: '.auth/docbase-user.json' });
    await browser.close();
  }

  console.log('✅ Authentication setup completed');
}


export default globalSetup;
