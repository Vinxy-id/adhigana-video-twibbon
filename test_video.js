import { chromium, webkit, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:5000';
const TEST_PHOTO_PATH = path.resolve('temp/test_sample_photo.png');

async function testVideoDownload(browserType, deviceName, deviceConfig) {
  console.log(`\n============================================================`);
  console.log(`🎥 TESTING VIDEO EXPORT: ${deviceName} (${browserType.name()})`);
  console.log(`============================================================`);

  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(deviceConfig);
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Upload test photo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PHOTO_PATH);
    await page.waitForTimeout(1000);

    // Click Download Video
    const downloadPromise = page.waitForEvent('download', { timeout: 45000 });
    const downloadVideoBtn = page.locator('button:has-text("Download Video")');
    await downloadVideoBtn.click();

    // Check modal progress appears
    const modalVisible = await page.locator('text=Menyiapkan pemrosesan video').or(page.locator('text=Merender video')).first().isVisible();
    console.log(`    Progress modal active: ${modalVisible}`);

    const videoDownload = await downloadPromise;
    const savePath = path.resolve(`temp/download_video_${deviceName.replace(/\s+/g, '_')}.mp4`);
    await videoDownload.saveAs(savePath);

    const stats = fs.statSync(savePath);
    console.log(`    ✅ Video downloaded: ${videoDownload.suggestedFilename()}`);
    console.log(`    Video file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return { success: true, sizeMb: (stats.size / 1024 / 1024).toFixed(2) };
  } catch (err) {
    console.error(`❌ Video download failed for ${deviceName}:`, err);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  // Test Video on iPhone (WebKit)
  const iosResult = await testVideoDownload(webkit, 'iPhone_14_Pro_iOS', {
    ...devices['iPhone 14 Pro'],
  });

  // Test Video on Android (Chromium)
  const androidResult = await testVideoDownload(chromium, 'Pixel_7_Android', {
    ...devices['Pixel 7'],
  });

  console.log('\n============================================================');
  console.log('📊 VIDEO TEST RESULTS:');
  console.log(`  • iOS WebKit Video: ${iosResult.success ? '✅ PASSED (' + iosResult.sizeMb + ' MB)' : '❌ FAILED'}`);
  console.log(`  • Android Video: ${androidResult.success ? '✅ PASSED (' + androidResult.sizeMb + ' MB)' : '❌ FAILED'}`);
  console.log('============================================================');
}

main().catch(console.error);
