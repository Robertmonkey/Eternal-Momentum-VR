import assert from 'assert';

test('vrMain loads with WebXR emulator', async () => {
  Object.defineProperty(global, 'navigator', {
    value: {
      xr: {
        isSessionSupported: async () => true,
        requestSession: async () => ({ end() {} })
      }
    },
    configurable: true
  });

  global.window = { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };

  global.document = {
    body: { appendChild() {} },
    createElement: () => ({ getContext: () => ({}) }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => ({ forEach() {} })
  };

  const mod = await import('../vrMain.js');
  assert.strictEqual(typeof mod.start, 'function');
  console.log('webxr integration test passed');
});
