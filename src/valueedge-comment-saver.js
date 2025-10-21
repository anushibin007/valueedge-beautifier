// Browser extension script for saving and restoring comment drafts

(function () {
	"use strict";

	// Define unique localStorage key name

	let DRAFT_KEY = `valueedge_comment_draft`;
	let TIMESTAMP_KEY = `valueedge_comment_draft_timestamp`;

	function loadTicketInfo() {
		const ticketId = document.querySelector(
			".entity-form-document-view-header-entity-id-container"
		)?.innerHTML;
		const ticketType = document.querySelector("[ng-if='header.shouldShowEntityLabel']")
			?.children[0]?.children[0]?.innerHTML;

		DRAFT_KEY = `valueedge_comment_draft_${ticketType}_${ticketId}`;
		TIMESTAMP_KEY = `valueedge_comment_draft_timestamp_${ticketType}_${ticketId}`;
	}

	loadTicketInfo();

	// Get comment box element
	function getCommentBox() {
		const commentPane = document.querySelector(".mqm-writing-new-comment-div");
		if (!commentPane) return null;
		const wrapper = commentPane.querySelector(".fr-wrapper");
		if (!wrapper) return null;
		return wrapper.childNodes[0];
	}

	// Get comment value
	function getCommentValue() {
		const commentBox = getCommentBox();
		console.log("Comment Box:", commentBox);
		return commentBox ? commentBox.innerHTML : "";
	}

	// Set comment value
	function setCommentValue(value) {
		const commentBox = getCommentBox();
		if (commentBox) {
			commentBox.innerHTML = value;
		}
	}

	// Save draft to localStorage
	function saveDraft() {
		const commentValue = getCommentValue();
		localStorage.setItem(DRAFT_KEY, commentValue);
		localStorage.setItem(TIMESTAMP_KEY, Date.now());
		updateLastSavedDisplay();
		// alert("Draft saved successfully!");
	}

	// Restore draft from localStorage
	function restoreDraft() {
		const savedDraft = localStorage.getItem(DRAFT_KEY);
		if (!savedDraft) return;

		if (
			confirm(
				"Are you sure you want to restore the saved draft? This will replace the current content."
			)
		) {
			setCommentValue(savedDraft);
			// alert("Draft restored successfully!");
		}
	}

	// Update last saved timestamp display
	function updateLastSavedDisplay() {
		const timestamp = localStorage.getItem(TIMESTAMP_KEY);
		const displayElement = document.getElementById("draft-last-saved-display");

		if (timestamp && displayElement) {
			const date = new Date(parseInt(timestamp));
			displayElement.textContent = `Draft last saved: ${date.toLocaleString()}`;
		}

		// Update restore button state
		if (restoreButton) {
			restoreButton.disabled = !hasSavedDraft();
		}
	}

	// Check if draft exists
	function hasSavedDraft() {
		return localStorage.getItem(DRAFT_KEY) !== null;
	}

	// Track if buttons have been added to avoid duplicates
	let buttonsAdded = false;
	let saveButton = null;
	let restoreButton = null;
	let lastSavedDisplay = null;

	// Create and insert buttons
	function createAndInsertButtons() {
		// Find the button container
		const buttonContainer = document.querySelector(
			"[data-aid='comments-pane-add-new-comment-button']"
		)?.parentElement;

		if (!buttonContainer || buttonsAdded) {
			return;
		}

		// Create "Save Draft" button
		saveButton = document.createElement("button");
		saveButton.className =
			"button--flat button--default button--slim section margin-t--4px margin-r--4px";
		saveButton.type = "button";
		saveButton.textContent = "Save Draft";
		saveButton.addEventListener("click", saveDraft);

		// Create "Restore Draft" button
		restoreButton = document.createElement("button");
		restoreButton.className =
			"button--flat button--default button--slim section margin-t--4px margin-r--4px";
		restoreButton.type = "button";
		restoreButton.textContent = "Restore Draft";
		restoreButton.disabled = !hasSavedDraft();
		restoreButton.addEventListener("click", restoreDraft);

		// Create "Draft last saved" display element
		lastSavedDisplay = document.createElement("span");
		lastSavedDisplay.id = "draft-last-saved-display";
		lastSavedDisplay.className = "margin-t--4px margin-r--4px";
		lastSavedDisplay.style.fontSize = "0.85em";
		lastSavedDisplay.style.color = "#666";
		lastSavedDisplay.style.alignSelf = "center";

		// Insert buttons before the existing "Add" button
		buttonContainer.insertBefore(saveButton, buttonContainer.firstChild);
		buttonContainer.insertBefore(restoreButton, buttonContainer.firstChild);
		// This is not coming as good as I expected, so commenting it out for now
		// buttonContainer.insertBefore(lastSavedDisplay, buttonContainer.firstChild);

		// Update display and button state
		updateLastSavedDisplay();
		buttonsAdded = true;
	}

	// Remove buttons when comment pane is hidden
	function removeButtons() {
		if (saveButton) saveButton.remove();
		if (restoreButton) restoreButton.remove();
		if (lastSavedDisplay) lastSavedDisplay.remove();
		saveButton = null;
		restoreButton = null;
		lastSavedDisplay = null;
		buttonsAdded = false;
	}

	// Initialize buttons
	function init() {
		// Try to add buttons initially
		createAndInsertButtons();

		// Set up MutationObserver to watch for comment pane appearance/disappearance
		const observer = new MutationObserver(() => {
			const buttonContainer = document.querySelector(
				"[data-aid='comments-pane-add-new-comment-button']"
			)?.parentElement;

			if (buttonContainer && !buttonsAdded) {
				// Comment pane appeared, add buttons
				createAndInsertButtons();
			} else if (!buttonContainer && buttonsAdded) {
				// Comment pane disappeared, remove buttons
				removeButtons();
			}
			loadTicketInfo();
		});

		// Start observing the document body for changes
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	// Run initialization when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
