"use strict";

(function () {
  /** @type {Set<number>} */
  const unloadTabSet = new Set();
  /** @type {Map<number, string>} */
  const reloadUrlMap = new Map();

  const URL_BLANK = "about:blank";
  const URL_RELOAD = browser.runtime.getURL("reload.html");

  /**
   * @param {browser.tabs.Tab} tab 
   * @param {object} changeInfo 
   */
  const isActivateUnloadTab = (tab, changeInfo) => {
    return tab.active === true && changeInfo.hasOwnProperty("discarded") && changeInfo.discarded === false && tab.hasOwnProperty("url") && tab.url === URL_BLANK && tab.status === "complete";
  }

  /**
   * @param {object} hasUrlObject 
   */
  const isUrlHttp = (hasUrlObject) => {
    return hasUrlObject.hasOwnProperty("url") && hasUrlObject.url.startsWith("http");
  }

  /**
   * @param {number} tabId 
   * @param {object} changeInfo 
   * @param {browser.tabs.Tab} tab 
   */
  const onTabUpdated = (tabId, changeInfo, tab) => {
    try {
      if (isActivateUnloadTab(tab, changeInfo)) {
        // detect unload tab
        unloadTabSet.add(tabId);
        return;
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
        return;
      }
      if (unloadTabSet.has(tabId) && changeInfo.hasOwnProperty("url") && changeInfo.url !== URL_BLANK) {
        unloadTabSet.delete(tabId);
        return;
      }
    } catch (e) {
      logging(e);
    }
  }

  /**
   * @param {object} details 
   */
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
    } catch (e) {
      logging(e);
    }
  }

  /**
   * @param {number} tabId 
   * @param {object} removeInfo 
   */
  const onTabRemoved = (tabId, removeInfo) => {
    try {
      unloadTabSet.delete(tabId);
      reloadUrlMap.delete(tabId);
    } catch (e) {
      logging(e);
    }
  }

  /**
   * @param {*} args 
   */
  const logging = (...args) => {
    // eslint-disable-next-line no-console
    console.log(...args);
    // eslint-disable-next-line no-console
    console.trace();
  }

  /** */
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