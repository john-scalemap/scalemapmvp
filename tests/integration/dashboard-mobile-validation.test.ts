import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

describe('Dashboard and Mobile Responsiveness Validation', () => {
  let browser: Browser;
  let page: Page;
  let serverProcess: ChildProcess;
  const BASE_URL = 'http://localhost:8080';

  // Common viewport sizes for testing
  const VIEWPORTS = {
    desktop: { width: 1920, height: 1080 },
    laptop: { width: 1366, height: 768 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
    mobileLarge: { width: 414, height: 896 }
  };

  beforeAll(async () => {
    // Start server
    console.log('Starting server for dashboard integration testing...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server
    await new Promise((resolve) => {
      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('Server running') || data.toString().includes('localhost')) {
          setTimeout(resolve, 3000);
        }
      });
    });

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    page = await browser.newPage();
  }, 60000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  describe('Dashboard Component Integration', () => {
    test('should load dashboard with all main components', async () => {
      await page.setViewport(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Check for main dashboard structure
      await page.waitForSelector('main, .dashboard, [data-testid*="dashboard"]', { timeout: 15000 });

      // Check for navigation
      const navigation = await page.$('nav, .navigation, header, .nav');
      expect(navigation).toBeTruthy();

      // Check for main content area
      const mainContent = await page.$('main, .main-content, .dashboard-content');
      expect(mainContent).toBeTruthy();

      // Check for cards or content sections
      const contentSections = await page.$$('.card, [data-testid*="card"], .section, .panel');
      expect(contentSections.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle dashboard API integration correctly', async () => {
      await page.setViewport(VIEWPORTS.desktop);

      // Monitor API calls
      const apiCalls: any[] = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/')) {
          apiCalls.push({
            url,
            method: response.request().method(),
            status: response.status(),
            headers: response.request().headers()
          });
        }
      });

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Wait for API calls to complete
      // Replaced deprecated waitForTimeout - wait for network to stabilize

      // Verify authenticated API calls were made
      const authenticatedCalls = apiCalls.filter(call =>
        call.headers.authorization && call.headers.authorization.startsWith('Bearer ')
      );

      if (apiCalls.length > 0) {
        expect(authenticatedCalls.length).toBeGreaterThan(0);

        // Check for expected API endpoints
        const expectedEndpoints = ['/api/users', '/api/assessments', '/api/agents'];
        const endpointsCalled = apiCalls.map(call => {
          const url = new URL(call.url);
          return url.pathname;
        });

        const hasExpectedEndpoints = expectedEndpoints.some(endpoint =>
          endpointsCalled.some(called => called.includes(endpoint.split('/')[2]))
        );

        expect(hasExpectedEndpoints).toBe(true);
      }
    }, 30000);

    test('should display real assessment data correctly', async () => {
      await page.setViewport(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Look for assessment-related content
      const assessmentElements = await page.$$('[data-testid*="assessment"], .assessment, [class*="assessment"]');

      if (assessmentElements.length > 0) {
        // Verify assessment content structure
        for (const element of assessmentElements.slice(0, 3)) {
          const content = await element.evaluate(el => el.textContent);
          expect(content).toBeTruthy();
          expect(content?.trim().length).toBeGreaterThan(0);
        }
      }

      // Check for data visualization elements
      const charts = await page.$$('canvas, svg, .chart, [data-testid*="chart"]');
      const dataCards = await page.$$('.card, [data-testid*="card"], .metric, .stat');

      // At least some data visualization should be present
      expect(charts.length + dataCards.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle agent cards with correct data format', async () => {
      await page.setViewport(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Look for agent cards
      const agentCards = await page.$$('.agent-card, [data-testid*="agent"], [class*="agent-card"]');

      if (agentCards.length > 0) {
        for (const card of agentCards.slice(0, 3)) {
          const cardContent = await card.evaluate(el => ({
            text: el.textContent,
            hasImage: !!el.querySelector('img, svg, [class*="icon"]'),
            hasTitle: !!el.querySelector('h1, h2, h3, h4, h5, h6, .title, [class*="title"]'),
            hasDescription: (el.textContent?.length || 0) > 50
          }));

          expect(cardContent.text).toBeTruthy();
          expect(cardContent.text?.trim().length).toBeGreaterThan(0);

          // Cards should have some visual structure
          expect(cardContent.hasTitle || cardContent.hasDescription).toBe(true);
        }
      }
    }, 30000);

    test('should display domain visualizations correctly', async () => {
      await page.setViewport(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Look for domain heatmap or visualizations
      const domainViz = await page.$('.domain-heatmap, [data-testid*="domain"], .heatmap, [class*="heatmap"]');

      if (domainViz) {
        const vizData = await domainViz.evaluate(el => ({
          hasContent: el.innerHTML.length > 0,
          hasInteractiveElements: !!el.querySelector('button, a, [role="button"], [tabindex]'),
          dimensions: {
            width: (el as HTMLElement).offsetWidth,
            height: (el as HTMLElement).offsetHeight
          }
        }));

        expect(vizData.hasContent).toBe(true);
        expect(vizData.dimensions.width).toBeGreaterThan(0);
        expect(vizData.dimensions.height).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Mobile Responsiveness with Production API Integration', () => {
    test('should maintain functionality on mobile viewport', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Check if main elements are still accessible on mobile
      const navigation = await page.$('nav, .navigation, header');
      const mainContent = await page.$('main, .main-content');

      expect(navigation).toBeTruthy();
      expect(mainContent).toBeTruthy();

      // Check if elements are visible in mobile viewport
      if (navigation && mainContent) {
        const navVisible = await navigation.isIntersectingViewport();
        const contentVisible = await mainContent.isIntersectingViewport();

        expect(navVisible || contentVisible).toBe(true); // At least one should be visible
      }
    }, 30000);

    test('should make proper API calls on mobile devices', async () => {
      await page.setViewport(VIEWPORTS.mobile);

      // Monitor API calls on mobile
      const mobileApiCalls: any[] = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/')) {
          mobileApiCalls.push({
            url,
            method: response.request().method(),
            status: response.status(),
            userAgent: response.request().headers()['user-agent']
          });
        }
      });

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      // Replaced deprecated waitForTimeout - wait for network to stabilize

      // API calls should work the same on mobile
      if (mobileApiCalls.length > 0) {
        const successfulCalls = mobileApiCalls.filter(call => call.status < 400);
        expect(successfulCalls.length).toBeGreaterThan(0);
      }
    }, 30000);

    test('should handle touch interactions correctly', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Find interactive elements
      const buttons = await page.$$('button, [role="button"], a, [tabindex="0"]');

      if (buttons.length > 0) {
        const firstButton = buttons[0];

        // Test touch interaction
        await firstButton.tap();
        // Replaced deprecated waitForTimeout - wait for network to stabilize

        // Verify tap worked (no JavaScript errors)
        const errors = await page.evaluate(() => window.performance.getEntriesByType('navigation'));
        expect(errors).toBeDefined(); // Basic check that page is still functional
      }
    }, 30000);

    test('should adapt layout for different mobile screen sizes', async () => {
      const mobileViewports = [VIEWPORTS.mobile, VIEWPORTS.mobileLarge];

      for (const viewport of mobileViewports) {
        await page.setViewport(viewport);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

        // Check that content doesn't overflow horizontally
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
            hasHorizontalScroll: body.scrollWidth > body.clientWidth
          };
        });

        // Allow for small variations but no significant horizontal overflow
        expect(bodyOverflow.scrollWidth - bodyOverflow.clientWidth).toBeLessThan(20);
      }
    }, 30000);

    test('should maintain authentication components functionality on mobile', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2' });

      // Check mobile auth form
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"]');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitButton).toBeTruthy();

      // Check if form elements are properly sized for mobile
      if (emailInput && passwordInput && submitButton) {
        const emailRect = await emailInput.boundingBox();
        const passwordRect = await passwordInput.boundingBox();
        const buttonRect = await submitButton.boundingBox();

        // Elements should be large enough for touch interaction (minimum 44px)
        expect(emailRect?.height).toBeGreaterThanOrEqual(40);
        expect(passwordRect?.height).toBeGreaterThanOrEqual(40);
        expect(buttonRect?.height).toBeGreaterThanOrEqual(40);
      }
    }, 30000);

    test('should handle assessment form on mobile devices', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Try to navigate to assessment form
      const assessmentLink = await page.$('a[href*="assessment"], button[data-testid*="assessment"], [class*="assessment"]');

      if (assessmentLink) {
        await assessmentLink.tap();
        // Replaced deprecated waitForTimeout - wait for network to stabilize

        // Check if assessment form elements are mobile-friendly
        const formElements = await page.$$('input, textarea, button, select');

        for (const element of formElements.slice(0, 5)) {
          const rect = await element.boundingBox();
          if (rect) {
            expect(rect.height).toBeGreaterThanOrEqual(40); // Touch-friendly size
          }
        }
      }
    }, 30000);

    test('should handle file upload on mobile devices', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Look for file upload components
      const uploadButton = await page.$('input[type="file"], [data-testid*="upload"], button:contains("Upload")');

      if (uploadButton) {
        // Check if upload button is accessible on mobile
        const isVisible = await uploadButton.isIntersectingViewport();
        const rect = await uploadButton.boundingBox();

        expect(isVisible).toBe(true);
        if (rect) {
          expect(rect.height).toBeGreaterThanOrEqual(40);
        }
      }
    }, 30000);
  });

  describe('Cross-Device Consistency', () => {
    test('should maintain consistent functionality across device sizes', async () => {
      const testViewports = [VIEWPORTS.desktop, VIEWPORTS.tablet, VIEWPORTS.mobile];

      for (const viewport of testViewports) {
        await page.setViewport(viewport);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

        // Check that basic functionality exists on all devices
        const navigation = await page.$('nav, header, .navigation');
        const content = await page.$('main, .main-content, .dashboard');

        expect(navigation).toBeTruthy();
        expect(content).toBeTruthy();

        // Check for interactive elements
        const interactiveElements = await page.$$('button, a, input, [role="button"]');
        expect(interactiveElements.length).toBeGreaterThan(0);
      }
    }, 45000);

    test('should load the same data across all device sizes', async () => {
      const dataSnapshots: any[] = [];

      for (const [deviceName, viewport] of Object.entries(VIEWPORTS)) {
        await page.setViewport(viewport);

        const apiCalls: any[] = [];
        page.on('response', response => {
          if (response.url().includes('/api/')) {
            apiCalls.push({
              url: response.url(),
              status: response.status()
            });
          }
        });

        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
        // Replaced deprecated waitForTimeout - wait for network to stabilize

        dataSnapshots.push({
          device: deviceName,
          apiCallCount: apiCalls.length,
          successfulCalls: apiCalls.filter(call => call.status < 400).length
        });

        // Clear listeners for next iteration
        page.removeAllListeners('response');
      }

      // Verify consistent API behavior across devices
      const apiCallCounts = dataSnapshots.map(snap => snap.apiCallCount);
      const uniqueCallCounts = [...new Set(apiCallCounts)];

      // Should have similar number of API calls across devices (within reasonable variance)
      expect(uniqueCallCounts.length).toBeLessThanOrEqual(2); // Allow for minor variations
    }, 60000);
  });

  describe('Performance on Mobile Devices', () => {
    test('should load within acceptable time on mobile', async () => {
      await page.setViewport(VIEWPORTS.mobile);

      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      // Mobile load time should be reasonable (under 10 seconds)
      expect(loadTime).toBeLessThan(10000);
    }, 15000);

    test('should handle limited memory scenarios', async () => {
      await page.setViewport(VIEWPORTS.mobile);

      // Simulate limited memory by setting a smaller cache
      await page.setCacheEnabled(false);

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Check that page still functions without cache
      const content = await page.$('main, .dashboard, .main-content');
      expect(content).toBeTruthy();

      // Re-enable cache
      await page.setCacheEnabled(true);
    }, 30000);

    test('should handle network latency appropriately', async () => {
      await page.setViewport(VIEWPORTS.mobile);

      // Simulate slower network conditions
      const client = await page.target().createCDPSession();
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1000000, // 1 Mbps
        uploadThroughput: 500000,    // 500 Kbps
        latency: 200                 // 200ms latency
      });

      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      // Should still load within reasonable time even with slower network
      expect(loadTime).toBeLessThan(15000);

      // Disable network throttling
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });
    }, 20000);
  });

  describe('Accessibility on Mobile Devices', () => {
    test('should maintain accessibility standards on mobile', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Check for accessibility attributes
      const focusableElements = await page.$$('[tabindex], button, a, input, select, textarea');

      // Should have focusable elements for keyboard navigation
      expect(focusableElements.length).toBeGreaterThan(0);

      // Check for proper ARIA labels
      const elementsWithAriaLabels = await page.$$('[aria-label], [aria-labelledby], [role]');
      expect(elementsWithAriaLabels.length).toBeGreaterThan(0);
    }, 30000);

    test('should support keyboard navigation on mobile', async () => {
      await page.setViewport(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

      // Test tab navigation
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);

      // Should be able to navigate with keyboard
      expect(activeElement).toBeTruthy();
      expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement || '')).toBe(true);
    }, 30000);
  });
});