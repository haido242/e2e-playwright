import { chromium, FullConfig } from '@playwright/test';
import { testCredentials } from './tests/helpers/credentials';

function getProjectsFromCliArgs(): string[] {
  const args = process.argv.slice(2);
  const projects: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--project=')) {
      projects.push(arg.replace('--project=', ''));
      continue;
    }

    if (arg === '--project' && args[i + 1]) {
      projects.push(args[i + 1]);
      i++;
    }
  }

  return projects
    .flatMap((p: string) => p.split(','))
    .map((p: string) => p.toLowerCase().trim())
    .filter(Boolean);
}

async function globalSetup(config: FullConfig) {
  console.log('🔐 Setting up authentication...');

  const testProjectsFromCli = getProjectsFromCliArgs();

  // Ưu tiên project thực tế Playwright đang chạy (ví dụ --project=tpa-chrome)
  const selectedProjectsFromConfig = (config.projects || [])
    .map(project => project.name.toLowerCase().trim())
    .filter(Boolean);

  // Có thể override bằng TEST_PROJECTS nếu cần chạy thủ công nhiều project
  const testProjectsFromEnv = process.env.TEST_PROJECTS
    ?.toLowerCase()
    .split(',')
    .map((p: string) => p.trim())
    .filter(Boolean) || [];

  const activeProjects: string[] =
    testProjectsFromCli.length > 0
      ? testProjectsFromCli
      : testProjectsFromEnv.length > 0
        ? testProjectsFromEnv
        : selectedProjectsFromConfig;

  if (activeProjects.length > 0) {
    const source = testProjectsFromCli.length > 0
      ? 'CLI --project'
      : testProjectsFromEnv.length > 0
        ? 'TEST_PROJECTS'
        : 'Playwright config';
    console.log(`Login only for projects (${source}): ${activeProjects.join(', ')}`);
  } else {
    console.log('No active project detected - will login for all configured systems');
  }

  // Xác định systems nào cần login
  const needsTPA = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('tpa'));
  const needsPVI = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('pvi'));
  const needsDiginotes = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('diginotes'));
  const needsDocbase = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('docbase'));
  const needsBic = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('bic'));
  const needsVbi = activeProjects.length === 0 || activeProjects.some((p: string) => p.includes('vbi'));

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

  // BIC Login (chỉ khi project BIC được chạy)
  if (needsBic && process.env.BIC_TEST_EMAIL && process.env.BIC_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.BIC_BASE_URL || 'http://localhost:3000';
    console.log(`Logging in to BIC at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', testCredentials.bic.email);
    await page.fill('#password', testCredentials.bic.password);
    await page.click('button[type=submit]');

    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ BIC login successful');

    await context.storageState({ path: '.auth/bic-user.json' });
    await browser.close();
  }

  // VBI Login (chỉ khi project VBI được chạy)
  if (needsVbi && process.env.VBI_TEST_EMAIL && process.env.VBI_TEST_PASSWORD) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseURL = process.env.VBI_BASE_URL || 'http://localhost:3000';
    console.log(`Logging in to VBI at ${baseURL}/login`);

    await page.goto(`${baseURL}/login`);
    await page.fill('#email', testCredentials.vbi.email);
    await page.fill('#password', testCredentials.vbi.password);
    await page.click('button[type=submit]');

    await page.waitForURL(/folders/, { timeout: 10000 });
    console.log('✅ VBI login successful');

    await context.storageState({ path: '.auth/vbi-user.json' });
    await browser.close();
  }

  console.log('✅ Authentication setup completed');
}


export default globalSetup;
