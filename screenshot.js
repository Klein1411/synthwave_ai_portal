const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to standard desktop size
  await page.setViewport({ width: 1280, height: 800 });
  
  // Navigate to the music visualizer page
  await page.goto('http://localhost:8000/static/music_visualizer.html');
  
  // Wait a few seconds for the scene to render fully and animations to run
  await new Promise(r => setTimeout(r, 3000));
  
  // Move mouse to trigger cursor and hover effect on the first card
  const cards = await page.$$('.card');
  if (cards.length > 0) {
      const box = await cards[0].boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise(r => setTimeout(r, 500)); // wait for transitions
  }
  
  // Take screenshot
  const screenshotPath = 'C:\\Users\\klein\\.gemini\\antigravity\\brain\\936f9fa7-46e0-4d43-a0e0-d552c62a4c94\\ui_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`Screenshot saved to: ${screenshotPath}`);
  await browser.close();
})();
