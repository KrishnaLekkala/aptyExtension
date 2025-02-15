
document.addEventListener("DOMContentLoaded", () => {

    const toggleAdBlock = document.getElementById("toggleAdBlock");
    const customFilterInput = document.getElementById("customFilterInput");
    const addFilterBtn = document.getElementById("addFilterBtn");
    const customFilterList = document.getElementById("customFilterList");
    const blockedAdsCount = document.getElementById("blockedAdsCount");


    const statsTable = document.getElementById("statsTable").querySelector("tbody");
    const dailyLimitInput = document.getElementById("dailyLimit");
    const setLimitBtn = document.getElementById("setLimit");
    const resetBtn = document.getElementById("resetData");

  
    
    const localNoteInput = document.getElementById("localNote");
    const saveLocalBtn = document.getElementById("saveLocal");
    const globalNoteInput = document.getElementById("globalNote");
    const addGlobalBtn = document.getElementById("addGlobal");
    const localNotesTable = document.getElementById("localNotesTable").querySelector("tbody");
    const globalNotesTable = document.getElementById("globalNotesTable").querySelector("tbody");


    const groupTabsBtn = document.getElementById("groupTabs");
    const saveSessionBtn = document.getElementById("saveSession");
    const restoreSessionBtn = document.getElementById("restoreSession");
    const groupedTabsTable = document.getElementById("groupedTabsTable").querySelector("tbody");
  
    const sections = document.querySelectorAll(".section");
    document.querySelectorAll("#menuSection button").forEach(button => {
        button.addEventListener("click", function () {
            sections.forEach(section => section.style.display = "none");
            document.getElementById(button.getAttribute("data-target")).style.display = "block";
        });
    });
  
    let currentPageUrl;
  
    
    chrome.storage.local.get(["adBlockEnabled", "customFilters", "blockedAdsCount"], (data) => {
        toggleAdBlock.checked = data.adBlockEnabled;
        blockedAdsCount.textContent = data.blockedAdsCount || 0;

        if (data.customFilters) {
            data.customFilters.forEach(filter => addFilterToList(filter));
        }
    });

    toggleAdBlock.addEventListener("change", () => {
        chrome.storage.local.set({ adBlockEnabled: toggleAdBlock.checked });
        alert("Ad Blocker " + (toggleAdBlock.checked ? "Enabled" : "Disabled"));
    });

    addFilterBtn.addEventListener("click", () => {
        const filter = customFilterInput.value.trim();
        if (filter) {
            chrome.storage.local.get("customFilters", (data) => {
                const filters = data.customFilters || [];
                filters.push(filter);
                chrome.storage.local.set({ customFilters: filters });
                addFilterToList(filter);
                customFilterInput.value = "";
            });
        }
    });

    function addFilterToList(filter) {
        const li = document.createElement("li");
        li.textContent = filter;
        customFilterList.appendChild(li);
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "updatePopupCount") {
            blockedAdsCount.textContent = message.count;
        }
    });
    
//productivity code 

 // Load tracked data
 chrome.storage.local.get(["trackedSites", "dailyLimit"], (data) => {
    if (data.trackedSites) {
      for (let site in data.trackedSites) {
        addRowToTable(site, Math.round(data.trackedSites[site] / 60)); // Convert to minutes
      }
    }
    if (data.dailyLimit) {
      dailyLimitInput.value = data.dailyLimit;
    }
  });

  // Function to add row to the table
  function addRowToTable(site, timeSpent) {
    let row = statsTable.insertRow();
    let siteCell = row.insertCell(0);
    let timeCell = row.insertCell(1);
    siteCell.textContent = site;
    timeCell.textContent = timeSpent;
  }

  // Set daily limit
  setLimitBtn.addEventListener("click", () => {
    let limit = dailyLimitInput.value;
    if (limit) {
      chrome.storage.local.set({ dailyLimit: limit });
      alert("Daily limit set to " + limit + " minutes");
    }
  });

  // Reset data
  resetBtn.addEventListener("click", () => {
    chrome.storage.local.set({ trackedSites: {} }, () => {
      alert("Tracking data reset!");
      location.reload();
    });
  });


//Notes Code
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        currentPageUrl = new URL(tabs[0].url).hostname;

        // Load local notes for this page
        chrome.storage.local.get("localNotes", (data) => {
            let notes = data.localNotes?.[currentPageUrl] || [];
            notes.forEach((note, index) => addNoteToTable(localNotesTable, note, index, "local"));
        });
    });

    // Load global notes
    chrome.storage.local.get("globalNotes", (data) => {
        let notes = data.globalNotes || [];
        notes.forEach((note, index) => addNoteToTable(globalNotesTable, note, index, "global"));
    });

    // Save Local Note
    saveLocalBtn.addEventListener("click", () => {
        let noteText = localNoteInput.value.trim();
        if (!noteText) return alert("Note cannot be empty!");

        chrome.storage.local.get("localNotes", (data) => {
            let localNotes = data.localNotes || {};
            let notes = localNotes[currentPageUrl] || [];

            notes.push(noteText);
            localNotes[currentPageUrl] = notes;

            chrome.storage.local.set({ localNotes }, () => {
                addNoteToTable(localNotesTable, noteText, notes.length - 1, "local");
                localNoteInput.value = "";
            });
        });
    });

    // Add Global Note
    addGlobalBtn.addEventListener("click", () => {
        let noteText = globalNoteInput.value.trim();
        if (!noteText) return alert("Note cannot be empty!");

        chrome.storage.local.get("globalNotes", (data) => {
            let notes = data.globalNotes || [];
            notes.push(noteText);

            chrome.storage.local.set({ globalNotes: notes }, () => {
                addNoteToTable(globalNotesTable, noteText, notes.length - 1, "global");
                globalNoteInput.value = "";
            });
        });
    });

    // Function to Add Note to Table
    function addNoteToTable(table, noteText, index, type) {
        let row = table.insertRow();
        let noteCell = row.insertCell(0);
        let actionCell = row.insertCell(1);

        noteCell.textContent = noteText;

        // Edit Button
        let editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";
        editBtn.onclick = () => editNote(index, type, table, row, noteText);
        actionCell.appendChild(editBtn);

        // Delete Button
        let deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = () => deleteNote(index, type, table, row);
        actionCell.appendChild(deleteBtn);
    }

    // Function to Edit a Note
    function editNote(index, type, table, row, oldText) {
        let newText = prompt("Edit your note:", oldText);
        if (!newText) return;

        if (type === "local") {
            chrome.storage.local.get("localNotes", (data) => {
                let localNotes = data.localNotes || {};
                let notes = localNotes[currentPageUrl] || [];
                notes[index] = newText;
                localNotes[currentPageUrl] = notes;

                chrome.storage.local.set({ localNotes }, () => {
                    row.cells[0].textContent = newText;
                });
            });
        } else if (type === "global") {
            chrome.storage.local.get("globalNotes", (data) => {
                let notes = data.globalNotes || [];
                notes[index] = newText;

                chrome.storage.local.set({ globalNotes: notes }, () => {
                    row.cells[0].textContent = newText;
                });
            });
        }
    }

    // Function to Delete a Note
    function deleteNote(index, type, table, row) {
        if (type === "local") {
            chrome.storage.local.get("localNotes", (data) => {
                let localNotes = data.localNotes || {};
                let notes = localNotes[currentPageUrl] || [];
                notes.splice(index, 1);
                localNotes[currentPageUrl] = notes;

                chrome.storage.local.set({ localNotes }, () => {
                    table.deleteRow(row.rowIndex - 1);
                });
            });
        } else if (type === "global") {
            chrome.storage.local.get("globalNotes", (data) => {
                let notes = data.globalNotes || [];
                notes.splice(index, 1);

                chrome.storage.local.set({ globalNotes: notes }, () => {
                    table.deleteRow(row.rowIndex - 1);
                });
            });
        }
    }



  //group tabs

  
  // Define tab categories
  const categories = {
      "Social Media": ["facebook.com", "twitter.com", "instagram.com", "linkedin.com"],
      "Work": ["gmail.com", "outlook.com", "slack.com", "trello.com"],
      "News": ["bbc.com", "cnn.com", "nytimes.com", "theguardian.com"]
  };

  // Group tabs based on category
  groupTabsBtn.addEventListener("click", () => {
      chrome.tabs.query({}, (tabs) => {
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

          for (let category in groups) {
              chrome.tabs.group({ tabIds: groups[category] }, (groupId) => {
                  chrome.tabGroups.update(groupId, { title: category });

                  // Save grouped tabs
                  chrome.storage.local.get("tabGroups", (data) => {
                      let tabGroups = data.tabGroups || [];
                      tabGroups.push({ name: category, tabIds: groups[category] });
                      chrome.storage.local.set({ tabGroups }, () => {
                          addGroupToTable(category, groups[category].length);
                      });
                  });
              });
          }
      });
  });

  // Load saved grouped tabs
  chrome.storage.local.get("tabGroups", (data) => {
      let tabGroups = data.tabGroups || [];
      tabGroups.forEach(group => addGroupToTable(group.name, group.tabIds.length));
  });

  // Save session
  saveSessionBtn.addEventListener("click", () => {
      chrome.tabs.query({}, (tabs) => {
          let sessionData = tabs.map(tab => ({ url: tab.url, title: tab.title }));
          chrome.storage.local.set({ savedSession: sessionData }, () => {
              alert("Session saved!");
          });
      });
  });

  // Restore session
  restoreSessionBtn.addEventListener("click", () => {
      chrome.storage.local.get("savedSession", (data) => {
          let sessionData = data.savedSession || [];
          sessionData.forEach(tab => chrome.tabs.create({ url: tab.url }));
      });
  });

  // Function to add group to the table
  function addGroupToTable(groupName, tabCount) {
      let row = groupedTabsTable.insertRow();
      let groupCell = row.insertCell(0);
      let countCell = row.insertCell(1);
      let actionCell = row.insertCell(2);

      groupCell.textContent = groupName;
      countCell.textContent = tabCount;

      // Restore Button
      let restoreBtn = document.createElement("button");
      restoreBtn.textContent = "Restore";
      restoreBtn.className = "restore-btn";
      restoreBtn.onclick = () => restoreTabGroup(groupName);
      actionCell.appendChild(restoreBtn);

      // Delete Button
      let deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => deleteTabGroup(groupName, row);
      actionCell.appendChild(deleteBtn);
  }

  // Function to restore a tab group
  function restoreTabGroup(groupName) {
      chrome.storage.local.get("tabGroups", (data) => {
          let tabGroups = data.tabGroups || [];
          let group = tabGroups.find(g => g.name === groupName);

          if (group) {
              group.tabIds.forEach(tabId => chrome.tabs.create({ url: `chrome://tabs/?id=${tabId}` }));
          }
      });
  }

  // Function to delete a tab group
  function deleteTabGroup(groupName, row) {
      chrome.storage.local.get("tabGroups", (data) => {
          let tabGroups = data.tabGroups || [];
          tabGroups = tabGroups.filter(g => g.name !== groupName);

          chrome.storage.local.set({ tabGroups }, () => {
              groupedTabsTable.deleteRow(row.rowIndex - 1);
          });
      });
  }

  });



  
