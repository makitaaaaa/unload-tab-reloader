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
    } catch (e) {
      logging(e);
    }
  }

  /**
   * @param {object} details 
   */
  const onWebNavigationBeforeNavigate = (details) => {
    try {
      let tabId = details.tabId;
      if (unloadTabSet.has(tabId) && isUrlHttp(details)) {
        // move to reload page
        unloadTabSet.delete(tabId);
        reloadUrlMap.set(tabId, details.url);
        browser.tabs.update(tabId, {
          url: `${URL_RELOAD}?${new URLSearchParams({url: details.url})}`,
          loadReplace: true
        });
        return;
      }
      if (reloadUrlMap.has(tabId) && details.hasOwnProperty("url") && details.url.startsWith(URL_RELOAD)) {
        // reload (move) tab
        const url = reloadUrlMap.get(tabId);
        reloadUrlMap.delete(tabId);
        browser.tabs.update(tabId, {
          url: url,
          loadReplace: true
        });
        return;
      }
    } catch (e) {
      logging(e);
    }
  }

  /**
   * 
   * @param {*} message 
   * @param {browser.runtime.MessageSender} sender 
   * @param {function} response 
   */
  const onMessage = (message, sender, response) => {
    try {
      if (message.hasOwnProperty("url") && message.url.startsWith(URL_RELOAD)) {
        // move to reload page
        const tab = sender.tab;
        const tabId = tab.id;
        unloadTabSet.delete(tabId);
        reloadUrlMap.delete(tabId);
        let url = new URL(message.url);
        const params = new URLSearchParams(url.search.slice(1));
        browser.tabs.update(tabId, {
          url: params.get("url"),
          loadReplace: true
        });
        return false;
      }
      return false;
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
    try {
      /** @type {browser.webNavigation.EventUrlFilters} */
      const URL_FILTER = {
        url: [{
          urlPrefix: URL_RELOAD
        }, {
          schemes: ["http", "https"]
        }]
      }
      browser.tabs.onUpdated.addListener(onTabUpdated);
      browser.tabs.onRemoved.addListener(onTabRemoved);
      browser.webNavigation.onBeforeNavigate.addListener(onWebNavigationBeforeNavigate, URL_FILTER);
      browser.runtime.onMessage.addListener(onMessage);
    } catch (e) {
      logging(e);
    }
  }

  initialize();
})();