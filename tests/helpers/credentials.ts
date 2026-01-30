/**
 * Test credentials từ environment variables
 * KHÔNG hardcode username/password trong code
 */

export const testCredentials = {
  tpa: {
    email: process.env.TPA_TEST_EMAIL || '',
    password: process.env.TPA_TEST_PASSWORD || '',
  },
  pvi: {
    email: process.env.PVI_TEST_EMAIL || '',
    password: process.env.PVI_TEST_PASSWORD || '',
  },
  diginotes: {
    email: process.env.DIGINOTES_TEST_EMAIL || '',
    password: process.env.DIGINOTES_TEST_PASSWORD || '',
  },
  docbase: {
    email: process.env.DOCBASE_TEST_EMAIL || '',
    password: process.env.DOCBASE_TEST_PASSWORD || '',
  },
};

/**
 * Validate credentials có được set chưa
 */
export function validateCredentials(project: 'tpa' | 'pvi' | 'diginotes' | 'docbase') {
  const creds = testCredentials[project];
  
  if (!creds.email || !creds.password) {
    throw new Error(
      `❌ Thiếu credentials cho ${project.toUpperCase()}!\n` +
      `Cần set environment variables:\n` +
      `  - ${project.toUpperCase()}_TEST_EMAIL\n` +
      `  - ${project.toUpperCase()}_TEST_PASSWORD\n\n` +
      `Xem .env.example để biết thêm chi tiết.`
    );
  }
  
  return creds;
}

export function isLoggedIn(page: any): Promise<boolean> {
  return page.evaluate(() => {
    return !!localStorage.getItem('token');
  });

}