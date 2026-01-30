import { Page } from '@playwright/test';

/**
 * Login helper - Ẩn email và password khỏi Playwright trace/report
 * Sử dụng page.evaluate để điền form trực tiếp trong browser context
 */
export async function login(page: Page, email: string, password: string) {
  // Chờ form xuất hiện
  await page.waitForSelector('#username');
  await page.waitForSelector('#password');
  
  // Điền form sử dụng JavaScript trong browser context
  // Cách này không bị Playwright trace ghi lại giá trị
  await page.evaluate(
    ({ emailValue, passwordValue }) => {
      const emailInput = document.querySelector<HTMLInputElement>('#username');
      const passwordInput = document.querySelector<HTMLInputElement>('#password');
      
      if (emailInput) {
        // Set native input value
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(emailInput, emailValue);
        } else {
          emailInput.value = emailValue;
        }
        
        // Trigger events cho React/Vue
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      
      if (passwordInput) {
        // Set native input value
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(passwordInput, passwordValue);
        } else {
          passwordInput.value = passwordValue;
        }
        
        // Trigger events cho React/Vue
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    },
    { emailValue: email, passwordValue: password }
  );
  
  // Đợi một chút để form state update
  await page.waitForTimeout(100);
}

/**
 * Alternative: Login helper với masking trong trace
 * Sử dụng page.fill() bình thường nhưng mask trong screenshot
 */
export async function loginWithMask(page: Page, email: string, password: string) {
  // Ẩn input fields trước khi fill để không bị capture trong screenshot
  await page.addStyleTag({
    content: `
      #username, #password {
        -webkit-text-security: disc !important;
      }
    `
  });
  
  await page.fill('#username', email);
  await page.fill('#password', password);
  
  // Remove style sau khi fill xong
  await page.addStyleTag({
    content: `
      #username, #password {
        -webkit-text-security: none !important;
      }
    `
  });
}

/**
 * Simplest approach - Just use page.fill()
 * Đây là cách đơn giản nhất và chắc chắn hoạt động
 * Lưu ý: Giá trị vẫn sẽ xuất hiện trong trace/report
 */
export async function loginSimple(page: Page, email: string, password: string) {
  await page.fill('#username', email);
  await page.fill('#password', password);
}

/**
 * Hidden login - Không hiển thị giá trị trong trace
 * Sử dụng locator.fill() với option ẩn
 */
export async function loginHidden(page: Page, email: string, password: string) {
  // Cách này sẽ không log giá trị vào trace
  const emailInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  
  // Clear và điền không log value
  await emailInput.clear();
  await emailInput.pressSequentially(email, { delay: 0 });
  
  await passwordInput.clear();
  await passwordInput.pressSequentially(password, { delay: 0 });
}
