// Browser extension script for saving and restoring comment drafts

(function () {
	"use strict";

	// ---- Proofread API configuration ----
	const PROOFREAD_API_BASE_URL = "https://jas-hcjt-server.otxlab.net/ve-inator-backend/api/v1";
	const PROOFREAD_API_ENDPOINT = `${PROOFREAD_API_BASE_URL}/improve`;
	const PROOFREAD_HEALTHCHECK_ENDPOINT = `${PROOFREAD_API_BASE_URL}/config/`;
	const PROOFREAD_IMPROVEMENT_TEMPLATE = "proofread_v1";

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
	let proofreadButton = null;
	let lastSavedDisplay = null;

	// ---- Proofread Modal Logic ----

	function createProofreadModal() {
		const existingModal = document.getElementById("ve-proofread-modal-overlay");
		if (existingModal) existingModal.remove();

		const overlay = document.createElement("div");
		overlay.id = "ve-proofread-modal-overlay";
		overlay.className = "ve-proofread-overlay";

		overlay.innerHTML = `
			<div class="ve-proofread-modal" role="dialog" aria-modal="true" aria-labelledby="ve-proofread-title">
				<div class="ve-proofread-modal-header">
					<span id="ve-proofread-title" class="ve-proofread-title">✨ Proofread Comment</span>
					<button class="ve-proofread-close-x" id="ve-proofread-close-x" title="Close">&times;</button>
				</div>
				<div class="ve-proofread-modal-body">
					<div class="ve-proofread-pane">
						<div class="ve-proofread-pane-header">
							<span class="ve-proofread-pane-label">Original</span>
							<div class="ve-proofread-pane-actions">
								<button class="ve-proofread-action-btn" id="ve-proofread-copy-original" title="Copy to clipboard">📋 Copy</button>
								<button class="ve-proofread-action-btn ve-proofread-use-btn" id="ve-proofread-use-original" title="Use this comment">✅ Use this</button>
							</div>
						</div>
						<div id="ve-proofread-original-content" class="ve-proofread-content" contenteditable="true" spellcheck="true"></div>
					</div>
					<div class="ve-proofread-divider"></div>
					<div class="ve-proofread-pane">
						<div class="ve-proofread-pane-header">
							<span class="ve-proofread-pane-label">Improved</span>
							<div class="ve-proofread-pane-actions">
								<button class="ve-proofread-action-btn" id="ve-proofread-copy-improved" title="Copy to clipboard">📋 Copy</button>
								<button class="ve-proofread-action-btn ve-proofread-use-btn" id="ve-proofread-use-improved" title="Use this comment">✅ Use this</button>
							</div>
						</div>
						<div id="ve-proofread-improved-content" class="ve-proofread-content ve-proofread-improved-pane" contenteditable="true" spellcheck="true">
							<div class="ve-proofread-loading" id="ve-proofread-loading">
								<span class="ve-proofread-spinner"></span> Proofreading…
							</div>
						</div>
					</div>
				</div>
				<div class="ve-proofread-modal-footer">
					<button class="ve-proofread-footer-btn ve-proofread-cancel-btn" id="ve-proofread-cancel">Cancel</button>
					<button class="ve-proofread-footer-btn ve-proofread-close-btn" id="ve-proofread-close">Close</button>
				</div>
			</div>
		`;

		document.body.appendChild(overlay);

		const originalPane = overlay.querySelector("#ve-proofread-original-content");
		const improvedPane = overlay.querySelector("#ve-proofread-improved-content");
		const loadingEl = overlay.querySelector("#ve-proofread-loading");

		// Populate original content
		const commentHTML = getCommentValue();
		originalPane.innerHTML = commentHTML;

		// Close helpers
		function closeModal() {
			overlay.remove();
		}

		overlay.querySelector("#ve-proofread-close-x").addEventListener("click", closeModal);
		overlay.querySelector("#ve-proofread-cancel").addEventListener("click", closeModal);
		overlay.querySelector("#ve-proofread-close").addEventListener("click", closeModal);

		// Close on backdrop click
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeModal();
		});

		// Copy to clipboard helper
		function copyPaneContent(pane, btn) {
			const text = pane.innerText || pane.textContent;
			navigator.clipboard.writeText(text).then(() => {
				const original = btn.textContent;
				btn.textContent = "✅ Copied!";
				setTimeout(() => (btn.textContent = original), 1500);
			}).catch(() => {
				alert("Clipboard access denied. Please allow clipboard permissions.");
			});
		}

		overlay.querySelector("#ve-proofread-copy-original").addEventListener("click", function () {
			copyPaneContent(originalPane, this);
		});

		overlay.querySelector("#ve-proofread-copy-improved").addEventListener("click", function () {
			copyPaneContent(improvedPane, this);
		});

		// Use this comment helpers
		function useComment(pane) {
			const html = pane.innerHTML;
			setCommentValue(html);
			closeModal();
		}

		overlay.querySelector("#ve-proofread-use-original").addEventListener("click", () => {
			useComment(originalPane);
		});

		overlay.querySelector("#ve-proofread-use-improved").addEventListener("click", () => {
			useComment(improvedPane);
		});

		// Call the proofread API
		const plainText = originalPane.innerText || originalPane.textContent;

		fetch(PROOFREAD_API_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				input_comment_text: plainText,
				improvement_template: PROOFREAD_IMPROVEMENT_TEMPLATE,
			}),
		})
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				loadingEl.remove();
				improvedPane.innerHTML = data.improved_comment_data || "";
			})
			.catch((err) => {
				loadingEl.remove();
				improvedPane.innerHTML = `<span class="ve-proofread-error">⚠️ Failed to proofread: ${err.message}</span>`;
				console.error("Proofread API error:", err);
			});
	}

	// ---- Backend healthcheck ----
	// Runs asynchronously; never blocks the host page.
	// Resolves true when /api/v1/config is reachable, false otherwise.
	async function isBackendReachable() {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 s timeout
			const res = await fetch(PROOFREAD_HEALTHCHECK_ENDPOINT, {
				method: "GET",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return res.ok;
		} catch {
			return false;
		}
	}

	// Show or hide the Proofread button based on backend availability.
	// Called once after buttons are inserted, and again whenever the comment
	// pane re-appears so the check stays fresh.
	async function refreshProofreadButtonVisibility() {
		if (!proofreadButton) return;
		const reachable = await isBackendReachable();
		proofreadButton.style.display = reachable ? "" : "none";
	}

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

		// Create "Proofread" button — hidden until healthcheck confirms backend is up
		proofreadButton = document.createElement("button");
		proofreadButton.className =
			"button--flat button--default button--slim section margin-t--4px margin-r--4px ve-proofread-btn";
		proofreadButton.type = "button";
		proofreadButton.textContent = "✨ Proofread";
		proofreadButton.style.display = "none"; // hidden until healthcheck passes
		proofreadButton.addEventListener("click", createProofreadModal);

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
		buttonContainer.insertBefore(proofreadButton, buttonContainer.firstChild);
		// This is not coming as good as I expected, so commenting it out for now
		// buttonContainer.insertBefore(lastSavedDisplay, buttonContainer.firstChild);

		// Update display and button state
		updateLastSavedDisplay();
		buttonsAdded = true;

		// Async healthcheck — fires in the background; does not block anything
		refreshProofreadButtonVisibility();
	}

	// Remove buttons when comment pane is hidden
	function removeButtons() {
		if (saveButton) saveButton.remove();
		if (restoreButton) restoreButton.remove();
		if (proofreadButton) proofreadButton.remove();
		if (lastSavedDisplay) lastSavedDisplay.remove();
		saveButton = null;
		restoreButton = null;
		proofreadButton = null;
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
				// Comment pane appeared, add buttons (healthcheck fires inside)
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
