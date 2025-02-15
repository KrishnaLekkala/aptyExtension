chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({  adBlockEnabled: false, customFilters: [], blockedAdsCount: 0});
  });
  
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ adBlockEnabled: false, customFilters: [], blockedAdsCount: 0 });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "updateBlockedCount") {
        chrome.storage.local.get("blockedAdsCount", (data) => {
            let newCount = (data.blockedAdsCount || 0) + message.count;
            chrome.storage.local.set({ blockedAdsCount: newCount });
            chrome.runtime.sendMessage({ type: "updatePopupCount", count: newCount });
        });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        chrome.storage.local.get(["adBlockEnabled", "customFilters"], (data) => {
            if (data.adBlockEnabled) {
                chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["content.js"]
                });
            }
        });
    }
});

//Productivity code 
let activeTab = null;
let startTime = null;
let interval = null;

// Load existing data or initialize storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["trackedSites", "dailyLimit"], (data) => {
        if (!data.trackedSites) chrome.storage.local.set({ trackedSites: {} });
        if (!data.dailyLimit) chrome.storage.local.set({ dailyLimit: 60 }); // Default to 60 minutes
    });
});

// Function to update time spent on the active tab
function updateTime() {
    if (activeTab && startTime) {
        let endTime = new Date().getTime();
        let timeSpent = (endTime - startTime) / 1000; // Convert to seconds
        startTime = endTime;

        chrome.storage.local.get(["trackedSites"], (data) => {
            let trackedSites = data.trackedSites || {};
            trackedSites[activeTab] = (trackedSites[activeTab] || 0) + timeSpent;
            chrome.storage.local.set({ trackedSites });
        });
    }
}

// Track tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
    updateTime();
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        activeTab = new URL(tab.url).hostname;
        startTime = new Date().getTime();
    });
});

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        updateTime();
        activeTab = new URL(tab.url).hostname;
        startTime = new Date().getTime();
    }
});

// Track when user switches away
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        updateTime();
        activeTab = null;
        startTime = null;
    }
});

// **NEW**: Update time every second if tab remains open
chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === "active" && activeTab) {
        if (!interval) {
            interval = setInterval(updateTime, 1000); // Update every second
        }
    } else {
        clearInterval(interval);
        interval = null;
        updateTime();
    }
});


//manage Notes
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["localNotes", "globalNotes"], (data) => {
      if (!data.localNotes) chrome.storage.local.set({ localNotes: {} });
      if (!data.globalNotes) chrome.storage.local.set({ globalNotes: [] });
    });
  });
  
  // Listen for save requests from popup.js or content.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "saveLocalNote") {
      chrome.storage.local.get("localNotes", (data) => {
        let localNotes = data.localNotes || {};
        localNotes[request.url] = request.notes;
  
        chrome.storage.local.set({ localNotes }, () => {
          sendResponse({ status: "success", message: "Local note saved successfully!" });
        });
      });
      return true;
    } 
    
    else if (request.type === "saveGlobalNote") {
      chrome.storage.local.get("globalNotes", (data) => {
        let globalNotes = data.globalNotes || [];
        globalNotes.push(request.note);
  
        chrome.storage.local.set({ globalNotes }, () => {
          sendResponse({ status: "success", message: "Global note added!" });
        });
      });
      return true;
    } 
    
    else if (request.type === "deleteGlobalNote") {
      chrome.storage.local.get("globalNotes", (data) => {
        let globalNotes = data.globalNotes || [];
        globalNotes.splice(request.index, 1);
  
        chrome.storage.local.set({ globalNotes }, () => {
          sendResponse({ status: "success", message: "Global note deleted!" });
        });
      });
      return true;
    }
  });
  

//tabs code 

const categories = {
    "Social Media": ["facebook.com", "twitter.com", "instagram.com", "linkedin.com"],
    "Work": ["gmail.com", "outlook.com", "slack.com", "trello.com"],
    "News": ["bbc.com", "cnn.com", "nytimes.com", "theguardian.com"]
  };
  
  // Function to group tabs
  async function groupTabs() {
    let tabs = await chrome.tabs.query({});
    let groups = {};
  
    tabs.forEach(tab => {
      for (let category in categories) {
        if (categories[category].some(domain => tab.url.includes(domain))) {
          if (!groups[category]) groups[category] = [];
          groups[category].push(tab.id);
          break;
        }
      }
    });
  
    // Create groups
    for (let category in groups) {
      chrome.tabs.group({ tabIds: groups[category] }, (groupId) => {
        chrome.tabGroups.update(groupId, { title: category });
      });
    }
  }
  
  // Listen for new tabs to auto-group them
  chrome.tabs.onCreated.addListener(() => {
    groupTabs();
  });
  
  // Save current session
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "saveSession") {
      chrome.tabs.query({}, (tabs) => {
        let sessionData = tabs.map(tab => ({ url: tab.url, title: tab.title }));
        chrome.storage.local.set({ savedSession: sessionData }, () => {
          sendResponse({ status: "success", message: "Session saved!" });
        });
      });
      return true;
    }
  
    if (request.type === "restoreSession") {
      chrome.storage.local.get("savedSession", (data) => {
        let sessionData = data.savedSession || [];
        sessionData.forEach(tab => {
          chrome.tabs.create({ url: tab.url });
        });
        sendResponse({ status: "success", message: "Session restored!" });
      });
      return true;
    }
  });
  