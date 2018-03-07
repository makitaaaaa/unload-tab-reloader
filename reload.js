"use strict";

(function () {
  let isUnload = false;
  window.addEventListener("unload", () => {
    isUnload = true;
  })
  setTimeout(() => {
    if (isUnload) {
      return;
    }
    browser.runtime.sendMessage({url:location.href});
  }, 1000);
})();