const getBadgeClassForPhase = (phaseText) => {
	if (!phaseText) {
		console.warn(`null phaseText: ${phaseText}`);
		return undefined;
	}

	if (phaseText.includes("New")) {
		return "text-bg-secondary";
	} else if (phaseText.includes("Ready")) {
		return "text-bg-primary";
	} else if (phaseText.includes("Planned")) {
		return "text-bg-primary";
	} else if (phaseText.includes("In Progress")) {
		return "text-bg-warning";
	} else if (phaseText.includes("Code Review")) {
		return "text-bg-pink";
	} else if (phaseText.includes("In Testing")) {
		return "text-bg-pink";
	} else if (phaseText.includes("Tested")) {
		return "text-bg-info";
	} else if (phaseText.includes("Implemented")) {
		return "text-bg-info";
	} else if (phaseText.includes("Fixed")) {
		return "text-bg-info";
	} else if (phaseText.includes("Done")) {
		return "text-bg-success";
	} else if (phaseText.includes("Completed")) {
		return "text-bg-success";
	} else if (phaseText.includes("Cancelled")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Pending Support")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Awaiting Decision")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Deferred")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Proposed Rejected")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Rejected")) {
		return "text-bg-danger";
	} else if (phaseText.includes("Duplicate")) {
		return "text-bg-danger";
	} else {
		console.warn(`Unknown phaseText: ${phaseText}`);
		return undefined;
	}
};

const applyBeautification = (elements) => {
	elements?.forEach((element) => {
		if (element.innerHTML) {
			const badgeClass = getBadgeClassForPhase(element.innerHTML);
			if (badgeClass) {
				element.classList.add("phase-beautifier");
				element.classList.add("badge");
				element.classList.add(getBadgeClassForPhase(element.innerHTML));
			}
		}
	});
};

const beautifyPhaseInUserStoryView = () => {
	const phaseElements = document.querySelectorAll(
		'[data-aid*="entity-life-cycle-widget-current-phase-label"]'
	);
	applyBeautification(phaseElements);
};

const beautifyPhaseInBacklogView = () => {
	const phaseElements = document.querySelectorAll('[field-name="phase"][role="cell"]');
	applyBeautification(phaseElements);
};

const beautifyPhaseInTeamBacklogView = () => {
	const parentElements = document.querySelectorAll('.alm-field-component[data-aid="phase"]');
	if (parentElements) {
		parentElements.forEach((parentElement) => {
			const entityChildren = parentElement.querySelectorAll('[entity="entity"]');
			applyBeautification(entityChildren);
		});
	}

	// const phaseElements = document.querySelectorAll('.alm-field-component[data-aid="phase"]');
	// applyBeautification(phaseElements);
};

// v1.2.0 Feature
// Beautify labels by adding emojis to the labels.
// This is to make it easier to find the labels in the ticket view.
var labelReplacements = [
	{
		searchKey: '[title="Legacy ID - (GU)ID of the source system. Set during migration."]',
		replacement: "👴",
		replaced: false,
	},
	{
		searchKey: '[title="R&D Product - Name of product this CR applies to"]',
		replacement: "👨‍💻",
		replaced: false,
	},
	{
		searchKey: '[title="Detected In Release"]',
		replacement: "🐛",
		replaced: false,
	},
	{
		searchKey: '[title="Target Release"]',
		replacement: "🚢",
		replaced: false,
	},
	{
		searchKey: '[title="Sprint"]',
		replacement: "🏃‍♂️",
		replaced: false,
	},
	{
		searchKey: '[title="Creation time"]',
		replacement: "🐣",
		replaced: false,
	},
];

const beautifyLabel = (query, replacement) => {
	const labelElements = document.querySelectorAll(query);
	labelElements?.forEach((labelElement) => {
		// Start the label with the emoji
		labelElement.innerHTML = `${replacement} ${labelElement.innerHTML}`;
	});
	if (labelElements?.length > 0) {
		return true;
	} else {
		return false;
	}
};

const beautifyLabels = () => {
	labelReplacements.forEach((aReplacement) => {
		if (aReplacement.replaced) {
			return;
		}
		const replaced = beautifyLabel(aReplacement.searchKey, aReplacement.replacement);
		aReplacement.replaced = replaced;
	});
};

// v1.2.2 Feature
// ChatGPT generated function to add a paste button to the login page.
const pasteButtonInLogin = () => {
	// handbrake to avoid infinite attempts
	if (window.__valueEdgeBeautifierPasteButtonInLoginAttempted) {
		console.log("pasteButtonInLoginAttempted. not attempting again.");
		return;
	}
	window.__valueEdgeBeautifierPasteButtonInLoginAttempted = true;
	console.log("ve-beautifier - starting addPasteButton");
	function addPasteButton() {
		let inputField = document.getElementById("nffc");

		// In the new UI, the input field is called smartphoneOTP
		// Attempt to get that field.
		if (!inputField) {
			inputField = document.getElementById("smartphoneOTP");
		}

		// If we got no field, just exit.
		if (!inputField) {
			console.log("inputField not found. exiting script.");
			return;
		}

		// Ensure button isn't added multiple times
		if (document.getElementById("paste-btn")) {
			console.log("paste-btn already exists. exiting script.");
			return;
		}

		// Find the factor-toggle div
		let toggleDiv = document.querySelector(".factor-toggle");
		if (!toggleDiv) {
			console.log("factor-toggle not found. exiting script.");
			return;
		}

		// Create a new div for Paste
		let pasteDiv = document.createElement("div");
		pasteDiv.className = "factor-toggle"; // Same class as Show/Hide button
		pasteDiv.id = "paste-btn";
		pasteDiv.style.marginTop = "5px";

		// Create the clickable text inside the div
		let pasteLink = document.createElement("a");
		pasteLink.innerText = "Paste from clipboard";
		pasteLink.href = "#";
		pasteLink.style.cursor = "pointer";

		// Add click event to paste text
		pasteLink.addEventListener("click", async (event) => {
			event.preventDefault(); // Prevents page navigation
			try {
				const text = await navigator.clipboard.readText();
				inputField.value = text;
			} catch (err) {
				alert(
					"Clipboard access denied. Please allow permissions from the page settings in your browser."
				);
				console.error("Clipboard error:", err);
			}
		});

		// Append the link inside the new div
		pasteDiv.appendChild(pasteLink);

		// Insert after the existing factor-toggle div
		toggleDiv.parentNode.insertBefore(pasteDiv, toggleDiv.nextSibling);
		console.log("ve-beautifier - ending addPasteButton");
	}

	// Call it once to see if it runs during invocation itself
	addPasteButton();

	// Run after the page loads
	document.addEventListener("DOMContentLoaded", addPasteButton);
};

// These scripts don't need a mutation observer.
// They simply need to be run in the auth page.
const runAuthRelatedScripts = () => {
	if (!window.location.href.includes("aaf.opentext.com")) {
		console.log("not running runAuthRelatedScripts");
		return;
	}
	pasteButtonInLogin();
};

/**
 * ********************** SIDEBAR TOGGLE SCRIPT STARTS **********************
 */
const addSidbarToggleButton = () => {
	// 1. Select the original <search-widget>
	const existingSearchBtnWidget = document.querySelector(
		"search-widget.header-search-widget.masthead-search.major"
	);

	// 2. Return if the original widget is not found
	if (!existingSearchBtnWidget) {
		return;
	}

	// 3. Check if your custom div already exists (by unique class or id)
	if (document.querySelector(".sidebar-toggle-widget-div")) {
		// Already present; do nothing
		return;
	}

	// 4. Create the new div and button
	const toggleSideBarDiv = document.createElement("div");
	toggleSideBarDiv.className = "sidebar-toggle-widget-div"; // Unique class for identification and styling

	const toggleSidebarBtn = document.createElement("button");
	toggleSidebarBtn.textContent = "Toggle Sidebar"; // Set button text
	toggleSidebarBtn.className = "sidebar-toggle-btn"; // Optional: add a class for styling

	// Add an onclick handler
	toggleSidebarBtn.onclick = function () {
		toggleDrawerAndPanel();
	};

	// 5. Add the button to the div
	toggleSideBarDiv.appendChild(toggleSidebarBtn);

	// 6. Insert the new div before the original widget
	existingSearchBtnWidget.parentNode.insertBefore(toggleSideBarDiv, existingSearchBtnWidget);

	// 7. Optionally, shift the div 10px to the left for visual distinction
	// newDiv.style.position = "relative";
	// newDiv.style.left = "-10px";
};

// Persistent cache variables
let cachedDrawerStyle = null;
let cachedPanelWidth = null;
let styleIsActive = true; // Tracks current toggle state

const toggleDrawerAndPanel = () => {
	// 1. Toggle the drawer style attribute
	const drawer = document.querySelector(".uxa-drawer.uxa-open.uxa-placement-end");
	if (!drawer) {
		// console.log("Drawer not found!");
		return;
	}

	// 2. Toggle the panel-content width
	const panel = document.querySelector('div[data-aid="panel-content"].panel-content');
	if (!panel) {
		// console.log("Panel content not found!");
		return;
	}

	if (styleIsActive) {
		// --- Drawer: Cache and remove style ---
		cachedDrawerStyle = drawer.getAttribute("style");
		drawer.setAttribute("style", "");

		// --- Panel: Cache and set width to 100% ---
		cachedPanelWidth = panel.style.width; // Only the inline width
		panel.style.width = "100%";

		styleIsActive = false;
	} else {
		// --- Drawer: Restore style ---
		if (cachedDrawerStyle !== null) {
			drawer.setAttribute("style", cachedDrawerStyle);
		}

		// --- Panel: Restore width ---
		if (cachedPanelWidth !== null) {
			panel.style.width = cachedPanelWidth;
		} else {
			panel.style.removeProperty("width");
		}

		styleIsActive = true;
	}
};

/**
 * ********************** SIDEBAR TOGGLE SCRIPT ENDS **********************
 */

if (!window.__valueEdgeBeautifierInitialized) {
	// Scripts that don't need a mutation oberver
	runAuthRelatedScripts();

	// Avoid multiple re-injection
	window.__valueEdgeBeautifierInitialized = true;

	// Somtimes, the beautification runs into a forever loop.
	// To avoid that, let's use an attempt counter.
	if (!window.__valueEdgeBeautifierBeautificationAttempts) {
		window.__valueEdgeBeautifierBeautificationAttempts = 0;
	}

	window.addEventListener("load", function () {
		const observer = new MutationObserver((mutationsList, observer) => {
			// Attempt to look for changes in the DOM only 10 times
			if (window.__valueEdgeBeautifierBeautificationAttempts <= 10) {
				beautifyPhaseInUserStoryView();
				beautifyPhaseInBacklogView();
				beautifyPhaseInTeamBacklogView();

				// Make the labels in the ticket view more appealing and easier to find
				beautifyLabels();
				addSidbarToggleButton();
				window.__valueEdgeBeautifierBeautificationAttempts++;
			}
		});

		// Start observing the document for changes
		observer.observe(document.body, { childList: true, subtree: true });

		// Disconnect the observer when the page unloads
		window.addEventListener("unload", function () {
			observer.disconnect();
		});
	});
}
