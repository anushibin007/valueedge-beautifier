// Browser extension script for saving and restoring comment drafts

(function () {
	"use strict";

	// ---- Improve API configuration ----
	const PROOFREAD_API_BASE_URL = "https://jas-hcjt-server.otxlab.net/ve-inator-backend/api/v1";
	const PROOFREAD_API_ENDPOINT = `${PROOFREAD_API_BASE_URL}/improve`;
	const PROOFREAD_HEALTHCHECK_ENDPOINT = `${PROOFREAD_API_BASE_URL}/config/`;
	const IMPROVE_TEMPLATES_ENDPOINT = `${PROOFREAD_API_BASE_URL}/improve/templates`;
	const PROOFREAD_IMPROVEMENT_TEMPLATE = "proofread_v1"; // fallback default

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

	// ---- Image strip / restore for backend calls ----
	// Replaces every <img> in the HTML with a text placeholder so the backend
	// never receives large base64 blobs or long server-side URLs.
	// Returns { strippedHtml, images } where images is an ordered array of the
	// original outerHTML strings for each extracted <img>.
	function stripImages(html) {
		const tmp = document.createElement("div");
		tmp.innerHTML = html;
		const images = [];
		tmp.querySelectorAll("img").forEach((img) => {
			const placeholder = document.createTextNode(`[[VE_IMG_${images.length}]]`);
			images.push(img.outerHTML);
			img.replaceWith(placeholder);
		});
		return { strippedHtml: tmp.innerHTML, images };
	}

	// Replaces [[VE_IMG_n]] placeholders in the response HTML back with the
	// original <img> outerHTML strings (in order). Placeholders the backend
	// echoed back are restored; any that are missing stay as-is.
	function restoreImages(html, images) {
		return html.replace(/\[\[VE_IMG_(\d+)\]\]/g, (match, idx) => {
			return images[parseInt(idx, 10)] || match;
		});
	}

	// ---- HTML-aware word-level diff highlighter ----
	// Preserves the block-level HTML structure from rawHtml (ul, li, p, etc.)
	// and applies word-level diff annotation within each matched block element.
	function buildHtmlAwareDiff(originalHtml, rawHtml) {
		const origDiv = document.createElement("div");
		origDiv.innerHTML = originalHtml;
		const impDiv = document.createElement("div");
		impDiv.innerHTML = rawHtml;

		// Collect innermost block-level elements that hold visible text
		function collectBlocks(root) {
			const blocks = Array.from(
				root.querySelectorAll("p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote")
			);
			// Fall back to root itself if no block elements found (plain text / inline-only)
			return blocks.length > 0 ? blocks : [root];
		}

		const origBlocks = collectBlocks(origDiv);
		const impBlocks  = collectBlocks(impDiv);

		// Pair improved blocks with original blocks by index.
		// Extra improved blocks (new paragraphs/list items) are treated as fully inserted.
		impBlocks.forEach((impBlock, i) => {
			const origText = origBlocks[i] ? origBlocks[i].textContent : "";
			// Replace only the text content of each block with the diff-annotated version,
			// keeping the surrounding block tag and its attributes intact.
			impBlock.innerHTML = buildWordDiffHtml(origText, impBlock.textContent);
		});

		return impDiv.innerHTML;
	}

	// ---- Word-level diff highlighter ----
	// Tokenises two plain-text strings into words+whitespace tokens, computes an
	// LCS-based diff, and returns an HTML string with <ins> around added/changed
	// tokens and <del> around removed ones.
	function buildWordDiffHtml(originalText, improvedText) {
		// Tokenise: keep whitespace as its own tokens so spacing is preserved
		function tokenise(str) {
			return str.match(/\S+|\s+/g) || [];
		}

		const a = tokenise(originalText);
		const b = tokenise(improvedText);

		// Build LCS table
		const m = a.length, n = b.length;
		const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
		for (let i = m - 1; i >= 0; i--) {
			for (let j = n - 1; j >= 0; j--) {
				dp[i][j] = a[i] === b[j]
					? dp[i + 1][j + 1] + 1
					: Math.max(dp[i + 1][j], dp[i][j + 1]);
			}
		}

		// Walk the diff
		const parts = [];
		let i = 0, j = 0;
		while (i < m || j < n) {
			if (i < m && j < n && a[i] === b[j]) {
				parts.push({ type: "eq", text: b[j] });
				i++; j++;
			} else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
				parts.push({ type: "ins", text: b[j] });
				j++;
			} else {
				parts.push({ type: "del", text: a[i] });
				i++;
			}
		}

		// Render: only show the improved pane (ins/del), escape HTML in tokens
		function esc(t) {
			return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}
		return parts.map((p) => {
			if (p.type === "eq")  return esc(p.text);
			if (p.type === "ins") return `<ins class="ve-diff-ins">${esc(p.text)}</ins>`;
			if (p.type === "del") return `<del class="ve-diff-del">${esc(p.text)}</del>`;
		}).join("");
	}

	// ---- Improve Modal Logic ----

	// Fetch available improvement templates from the backend.
	// Returns an array of { id, title, enabled, description } objects.
	// Falls back to a built-in default if the endpoint is unreachable.
	async function fetchImproveTemplates() {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			const res = await fetch(IMPROVE_TEMPLATES_ENDPOINT, {
				method: "GET",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			// Keep only enabled templates
			return data.filter((t) => t.enabled !== false);
		} catch {
			// Fallback so the modal is still usable when templates endpoint is down
			return [{ id: PROOFREAD_IMPROVEMENT_TEMPLATE, title: "Proofread", enabled: true, description: "Proofreads the given input and fixes spelling and grammatical issues" }];
		}
	}

	async function createImproveModal() {
		const existingModal = document.getElementById("ve-proofread-modal-overlay");
		if (existingModal) existingModal.remove();

		const overlay = document.createElement("div");
		overlay.id = "ve-proofread-modal-overlay";
		overlay.className = "ve-proofread-overlay";

		overlay.innerHTML = `
			<div class="ve-proofread-modal" role="dialog" aria-modal="true" aria-labelledby="ve-proofread-title">
				<div class="ve-proofread-modal-header">
					<div>
						<span id="ve-proofread-title" class="ve-proofread-title">Improve Comment</span>
						<div class="ve-proofread-subtitle">provided by ValueEdge Beautifier</div>
					</div>
					<button class="ve-proofread-close-x" id="ve-proofread-close-x" title="Close">&times;</button>
				</div>
				<div class="ve-proofread-modal-body">
					<div class="ve-proofread-panes-header">
						<div class="ve-proofread-pane-header-cell">
							<span class="ve-proofread-pane-label">Original</span>
						</div>
						<div class="ve-proofread-pane-header-cell ve-improved-header-cell">
							<span class="ve-proofread-pane-label">Improved</span>
							<div class="ve-improved-controls">
								<select id="ve-improve-template-select" class="ve-improve-template-select" disabled>
									<option value="">Loading…</option>
								</select>
								<button class="ve-proofread-refresh-btn" id="ve-proofread-refresh" title="Re-run with selected improvement type" disabled>Improve again</button>
							</div>
						</div>
					</div>
					<div class="ve-proofread-panes-row">
						<div id="ve-proofread-original-content" class="ve-proofread-content" contenteditable="true" spellcheck="true" data-placeholder="Start writing your comment…"></div>
						<div class="ve-improved-pane-wrap">
							<div id="ve-proofread-improved-content" class="ve-proofread-content ve-proofread-improved-pane" contenteditable="false" spellcheck="false" data-placeholder="Select an improvement type to see improvements here."></div>
							<label class="ve-diff-toggle-wrap" id="ve-diff-toggle" title="Toggle inline diff highlights">
								<span class="ve-diff-toggle-label">Show diff</span>
								<span class="ve-diff-switch">
									<span class="ve-diff-switch-thumb"></span>
								</span>
							</label>
						</div>
					</div>
				</div>
				<div class="ve-proofread-modal-footer">
					<button class="ve-proofread-footer-btn ve-proofread-cancel-btn" id="ve-proofread-cancel">Cancel</button>
					<button class="ve-proofread-footer-btn ve-proofread-use-improved-btn" id="ve-proofread-use-improved">Use improved</button>
				</div>
			</div>
		`;

		document.body.appendChild(overlay);

		const originalPane = overlay.querySelector("#ve-proofread-original-content");
		const improvedPane = overlay.querySelector("#ve-proofread-improved-content");
		const refreshBtn = overlay.querySelector("#ve-proofread-refresh");
		const templateSelect = overlay.querySelector("#ve-improve-template-select");

		// Populate original content from the comment box (may be empty)
		originalPane.innerHTML = getCommentValue();

		// Helper: returns true if the pane is blank or contains only whitespace/<br> nodes
		function isPaneEmpty(pane) {
			const text = pane.textContent.trim();
			if (text.length > 0) return false;
			return true;
		}

		if (isPaneEmpty(originalPane)) {
			originalPane.innerHTML = "";
		}

		// Enable "Improve again" only when Original pane has real content and templates loaded
		function syncRefreshBtn() {
			refreshBtn.disabled = isPaneEmpty(originalPane) || templateSelect.disabled;
		}
		syncRefreshBtn();
		originalPane.addEventListener("input", syncRefreshBtn);

		// Close helpers
		function closeModal() {
			overlay.remove();
		}

		overlay.querySelector("#ve-proofread-close-x").addEventListener("click", closeModal);
		overlay.querySelector("#ve-proofread-cancel").addEventListener("click", closeModal);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeModal();
		});

		overlay.querySelector("#ve-proofread-use-improved").addEventListener("click", () => {
			// Use the original rich-text HTML, not the diff markup
			const rawHtml = improvedPane.dataset.rawHtml;
			setCommentValue(rawHtml !== undefined ? rawHtml : improvedPane.innerHTML);
			closeModal();
		});

		// Diff toggle — show/hide <ins>/<del> highlights in the improved pane
		const diffToggleBtn = overlay.querySelector("#ve-diff-toggle");
		let diffVisible = true;
		diffToggleBtn.classList.add("ve-diff-toggle-on"); // start: diff visible
		diffToggleBtn.addEventListener("click", () => {
			diffVisible = !diffVisible;
			improvedPane.classList.toggle("ve-diff-hidden", !diffVisible);
			diffToggleBtn.classList.toggle("ve-diff-toggle-on", diffVisible);
		});

		// ---- Improve API call (reusable) ----
		function runImprove() {
			if (isPaneEmpty(originalPane)) return;
			const selectedTemplate = templateSelect.value || PROOFREAD_IMPROVEMENT_TEMPLATE;
			const selectedTitle = templateSelect.options[templateSelect.selectedIndex]?.text || "Improving";

			refreshBtn.disabled = true;
			refreshBtn.textContent = "Improving…";

			improvedPane.innerHTML = `
				<div class="ve-proofread-loading">
					<span class="ve-proofread-spinner"></span> ${selectedTitle}…
				</div>`;

			// Strip images before sending — avoids sending large base64 blobs or
			// long server-side URLs that cause backend timeouts.
			const { strippedHtml, images } = stripImages(originalPane.innerHTML);

			fetch(PROOFREAD_API_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					input_comment_text: strippedHtml,
					improvement_template: selectedTemplate,
				}),
			})
				.then((res) => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				})
				.then((data) => {
					// Restore images from placeholders before rendering or storing
					const rawHtml = restoreImages(data.improved_comment_data || "", images);
					// Render diff against the original (with images stripped for text diff,
					// but restore images in the final display HTML)
					const strippedOriginal = images.length > 0 ? strippedHtml : originalPane.innerHTML;
					const strippedImproved = stripImages(rawHtml).strippedHtml;
					const diffHtml = buildHtmlAwareDiff(strippedOriginal, strippedImproved);
					// Re-restore images in the diff output so they appear in the pane
					improvedPane.innerHTML = restoreImages(diffHtml, images);
					improvedPane.dataset.rawHtml = rawHtml;
				})
				.catch((err) => {
					improvedPane.innerHTML = `<span class="ve-proofread-error">⚠️ Failed to improve: ${err.message}</span>`;
					console.error("Improve API error:", err);
				})
				.finally(() => {
					refreshBtn.disabled = false;
					refreshBtn.textContent = "Improve again";
				});
		}

		refreshBtn.addEventListener("click", runImprove);

		// Load templates and populate dropdown, then auto-run if content exists
		fetchImproveTemplates().then((templates) => {
			templateSelect.innerHTML = "";
			if (templates.length === 0) {
				const opt = document.createElement("option");
				opt.value = PROOFREAD_IMPROVEMENT_TEMPLATE;
				opt.textContent = "Proofread";
				templateSelect.appendChild(opt);
			} else {
				templates.forEach((t) => {
					const opt = document.createElement("option");
					opt.value = t.id;
					opt.textContent = t.title;
					if (t.description) opt.title = t.description;
					templateSelect.appendChild(opt);
				});
			}
			templateSelect.disabled = false;
			syncRefreshBtn();

			// Auto-trigger when the user changes the template
			templateSelect.addEventListener("change", () => {
				if (!isPaneEmpty(originalPane)) runImprove();
			});

			// Auto-trigger if the comment box already had content
			if (!isPaneEmpty(originalPane)) {
				runImprove();
			}
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

	// Show or hide the Improve button based on backend availability.
	async function refreshProofreadButtonVisibility() {
		if (!proofreadButton) return;
		const reachable = await isBackendReachable();
		proofreadButton.style.display = reachable ? "" : "none";
	}

	// Returns the button container for either a new comment or an edit-existing
	// comment writing state. The new-comment state has a sibling "Add comment"
	// button with data-aid='comments-pane-add-new-comment-button'; the edit state
	// has no such button but its writing div carries the class
	// 'mqm-editing-comment-div'. Both share the same data-aid on the writing
	// wrapper that contains the froala editor and the Save/Cancel row.
	function findButtonContainer() {
		// New-comment flow: the "Add comment" button's parent holds Save/Cancel/etc.
		const viaAddBtn = document.querySelector(
			"[data-aid='comments-pane-add-new-comment-button']"
		)?.parentElement;
		if (viaAddBtn) return viaAddBtn;

		// Edit-existing-comment flow: find the native Save/Cancel button row.
		// The Save/Cancel buttons are siblings of the froala writing container
		// inside .mqm-editing-comment-div. Find the Save button that is NOT
		// inside the froala toolbar (not .fr-toolbar), then use its parent.
		const editingDiv = document.querySelector(".mqm-editing-comment-div");
		if (editingDiv) {
			// Look for a <button> with text "Save" that is outside the froala toolbar
			const saveBtn = Array.from(editingDiv.querySelectorAll("button")).find(
				(btn) => btn.textContent.trim() === "Save" && !btn.closest(".fr-toolbar")
			);
			if (saveBtn) return saveBtn.parentElement;
			// Fallback: return the editing div — buttons will still show, just at top
			return editingDiv;
		}

		return null;
	}

	// Create and insert buttons
	function createAndInsertButtons() {
		// Find the button container
		const buttonContainer = findButtonContainer();

		if (!buttonContainer || buttonsAdded) {
			return;
		}

		// SVG icons — inline so no external assets needed
		const ICON_SAVE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
		const ICON_RESTORE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
		const ICON_IMPROVE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.8a1 1 0 0 0 .6.6L20.3 11.3l-4.8 1.9a1 1 0 0 0-.6.6L13 19.3l-1.9-5.8a1 1 0 0 0-.6-.6L4.7 11l4.8-2a1 1 0 0 0 .6-.6L12 3z"/><path d="M5 3l.8 2.4a.4.4 0 0 0 .2.2L8.3 6.4 5.9 7.2a.4.4 0 0 0-.2.2L5 9.9 4.2 7.5a.4.4 0 0 0-.2-.2L1.7 6.6l2.4-.8a.4.4 0 0 0 .2-.2L5 3z"/></svg>`;

		const ICON_BTN_CLASS = "button--flat button--default button--slim section margin-t--4px margin-r--4px ve-icon-btn";

		// Create "Save Draft" button
		saveButton = document.createElement("button");
		saveButton.className = ICON_BTN_CLASS;
		saveButton.type = "button";
		saveButton.title = "Save Draft";
		saveButton.setAttribute("aria-label", "Save Draft");
		saveButton.innerHTML = ICON_SAVE;
		saveButton.addEventListener("click", saveDraft);

		// Create "Restore Draft" button
		restoreButton = document.createElement("button");
		restoreButton.className = ICON_BTN_CLASS;
		restoreButton.type = "button";
		restoreButton.title = "Restore Draft";
		restoreButton.setAttribute("aria-label", "Restore Draft");
		restoreButton.innerHTML = ICON_RESTORE;
		restoreButton.disabled = !hasSavedDraft();
		restoreButton.addEventListener("click", restoreDraft);

		// Create "Improve" button — hidden until healthcheck confirms backend is up
		proofreadButton = document.createElement("button");
		proofreadButton.className = ICON_BTN_CLASS;
		proofreadButton.type = "button";
		proofreadButton.title = "Improve";
		proofreadButton.setAttribute("aria-label", "Improve");
		proofreadButton.innerHTML = ICON_IMPROVE;
		proofreadButton.style.display = "none"; // hidden until healthcheck passes
		proofreadButton.addEventListener("click", createImproveModal);

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
			const buttonContainer = findButtonContainer();

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
