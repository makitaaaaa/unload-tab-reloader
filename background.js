"use strict";

(function () {
  /** @type {Set<number>} */
  const unloadTabSet = new Set();
  /** @type {Map<number, string>} */
  const reloadUrlMap = new Map();

  const URL_BLANK = "about:blank";
  const URL_RELOAD = browser.runtime.getURL("reload.html");

  const isActivateUnloadTab = (tab, changeInfo) => {
    return changeInfo.hasOwnProperty("discarded") && changeInfo.discarded === false && tab.hasOwnProperty("url") && tab.url === URL_BLANK && tab.status === "complete";
  }

  const isUrlHttp = (hasUrlObject) => {
    return hasUrlObject.hasOwnProperty("url") && hasUrlObject.url.startsWith("http");
  }

  const onTabUpdated = async (tabId, changeInfo, tab) => {
    try {
      if (isActivateUnloadTab(tab, changeInfo)) {
        // detect unload tab
        unloadTabSet.add(tabId);
        return true;
      }
      if (unloadTabSet.has(tabId) && isUrlHttp(tab)) {
        // move to reload page
        unloadTabSet.delete(tabId);
        const url = tab.url;
        reloadUrlMap.set(tabId, url);
        browser.tabs.update(tabId, {
          url: URL_RELOAD,
          loadReplace: false
        });
        return true;
      }
      if (unloadTabSet.has(tabId) && changeInfo.hasOwnProperty("url") && changeInfo.url !== URL_BLANK) {
        unloadTabSet.delete(tabId);
        return true;
      }
    } catch (e) {
      logging(e);
    }
    return true;
  }

  const onWebNavigationBeforeNavigate = async (details) => {
    try {
      let tabId = details.tabId;
      let url = details.url;
      if (reloadUrlMap.has(tabId) && url === URL_RELOAD) {
        // reload (move) tab
        const url = reloadUrlMap.get(tabId);
        reloadUrlMap.delete(tabId);
        browser.tabs.update(tabId, {
          url: url,
          loadReplace: true
        });
      }
      return true;
    } catch (e) {
      logging(e);
    }
  }

  const onTabRemoved = (tabId, removeInfo) => {
    try {
      unloadTabSet.delete(tabId);
      reloadUrlMap.delete(tabId);
    } catch (e) {
      logging(e);
    }
  }

  const logging = (...args) => {
    // eslint-disable-next-line no-console
    console.log(...args);
    // eslint-disable-next-line no-console
    console.trace();
  }

  const initialize = () => {
    const URL_FILTER = {
      url: [{
        urlEquals: URL_RELOAD
      }]
    }
    browser.tabs.onUpdated.addListener(onTabUpdated);
    browser.tabs.onRemoved.addListener(onTabRemoved);
    browser.webNavigation.onBeforeNavigate.addListener(onWebNavigationBeforeNavigate, URL_FILTER);
  }

  initialize();
})();