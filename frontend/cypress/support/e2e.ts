// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

Cypress.on("window:before:load", (win) => {
  if (!win.crypto.randomUUID) {
    Object.defineProperty(win.crypto, "randomUUID", {
      value: () => "00000000-0000-4000-8000-000000000000",
      writable: true,
      configurable: true,
    });
  }

  if (!win.crypto.subtle) {
    Object.defineProperty(win.crypto, "subtle", {
      value: {
        encrypt: () => Promise.resolve(new ArrayBuffer(0)),
        decrypt: () => Promise.resolve(new ArrayBuffer(0)),
      },
      writable: true,
      configurable: true,
    });
  }
});
