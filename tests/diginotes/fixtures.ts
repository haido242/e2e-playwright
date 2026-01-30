import { test as base } from '@playwright/test';

// Extend base test để thêm health check
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    // Log base URL trước mỗi test
    console.log(`🔍 Using baseURL: ${baseURL}`);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
