// Jest setup to provide minimal DOM functions used by Three.js loaders
if (typeof global.document === 'undefined') {
  global.document = {};
}
if (!global.document.createElementNS) {
  global.document.createElementNS = () => ({ getContext: () => ({}) });
}
