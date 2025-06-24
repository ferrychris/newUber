// Polyfills for Node.js modules in browser environment
// This file provides empty implementations of Node.js modules
// that are required by the postgres library but not available in browsers

// Create empty implementations for Node.js modules
const nodeCrypto = {};
const nodeOs = {};
const nodeFs = {};
const nodePath = {};
const nodeStream = {};
const nodeTls = {};
const nodeNet = {};
const nodeUtil = {};
const nodeBuffer = {};
const nodePerf = {
  performance: {
    now: () => Date.now()
  }
};

// Export the polyfills
export {
  nodeCrypto as crypto,
  nodeOs as os,
  nodeFs as fs,
  nodePath as path,
  nodeStream as stream,
  nodeTls as tls,
  nodeNet as net,
  nodeUtil as util,
  nodeBuffer as buffer,
  nodePerf as perf_hooks
};
