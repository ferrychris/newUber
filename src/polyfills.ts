// Node.js polyfills for browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer as any;
window.global = window as any;

// Add process.env for libraries that expect it
window.process = window.process || { env: {} } as any;

export {};
