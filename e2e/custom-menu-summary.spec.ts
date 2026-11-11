import { test, expect } from '@playwright/test';
for (const theme of ['light', 'dark']) {
  test(`${theme}: custom menu stays editable without the duplicate estimate card`, async ({page}, info)=>{
    await page.setViewportSize({width:390,height:844});
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(!['localhost','127.0.0.1'].includes(url.hostname))return route.abort();
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:{success:true,orders:[],sessions:{},items:[],menuItems:[],settings:{}}});
      return route.continue();
    });
    await page.addInitScript(theme=>{
      localStorage.setItem('app_theme',theme);localStorage.setItem('CapacitorStorage.app_theme',theme);
      localStorage.setItem('wawasan_language','en');localStorage.setItem('wawasan_order_tip_dismissed_v1','1');
      localStorage.setItem('wawasan_ghost_demo_seen_v1','1');localStorage.setItem('wawasan_privacy_acknowledged','true');
      sessionStorage.setItem('wawasan_session_started','true');sessionStorage.setItem('wawasan_guest_allowed','true');
    },theme);
    await page.goto('/#/order');
    await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({timeout:15000});
    await page.locator('[data-tour="step1-event-type"] button').last().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    const custom=page.getByPlaceholder('e.g. Nasi Minyak dengan Ayam Masak Merah...');
    await custom.fill('Custom menu example');
    await expect(page.getByText('Price Estimation:',{exact:true})).toHaveCount(0);
    await expect(page.getByText('Dishes Selected:',{exact:true})).toHaveCount(0);
    await expect(page.locator('.customer-order-summary')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
    await page.screenshot({path:info.outputPath('custom-menu.png'),fullPage:true});
    await page.locator('[data-tour="step2-next"]').click();
    await expect(page.locator('#event-date')).toBeVisible();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(custom).toHaveValue('Custom menu example');
  });
}
