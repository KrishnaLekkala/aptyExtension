$(document).ready(function () {

    let pageUrl = window.location.hostname;

    chrome.storage.local.get(["adBlockEnabled", "customFilters"], (data) => {
        if (!data.adBlockEnabled) return;
    
        let adSelectors = [
            "iframe[width='300'][height='250']", ".ad-banner", ".adsbygoogle",
            ".advertisement", ".sponsored", "[id^=ad_]", "[class*='ad-']",
            "[data-adblock]", ".ad-container", ".ad-wrapper"
        ];
    
        if (data.customFilters) {
            adSelectors = adSelectors.concat(data.customFilters);
        }
    
        function removeAds() {
            let blockedCount = 0;
            adSelectors.forEach((selector) => {
                document.querySelectorAll(selector).forEach((ad) => {
                    ad.remove();
                    blockedCount++;
                });
            });
    
            if (blockedCount > 0) {
                chrome.runtime.sendMessage({ type: "updateBlockedCount", count: blockedCount });
            }
        }
    
        function observeAds() {
            const observer = new MutationObserver(() => removeAds());
            observer.observe(document.body, { childList: true, subtree: true });
        }
    
        removeAds();
        observeAds();
    });


   // Load saved local notes
   chrome.storage.local.get("localNotes", (data) => {
    let notes = data.localNotes || {};
    let pageNotes = notes[pageUrl] || "";
    displayNoteInput(pageNotes);
  });

  function displayNoteInput(existingNote) {
    let noteContainer = $('<div id="noteContainer"></div>');
    let textarea = $('<textarea id="pageNote"></textarea>').val(existingNote);
    let saveButton = $('<button id="saveNote">Save Note</button>');

    noteContainer.append(textarea).append(saveButton);
    $("body").append(noteContainer);

    $("#saveNote").click(() => {
      let newNote = $("#pageNote").val();
      chrome.runtime.sendMessage({ type: "saveLocalNote", url: pageUrl, notes: newNote }, (response) => {
        alert(response.message);
      });
    });
  }
  });
  