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
	function addPasteButton() {
		console.log("starting addPasteButton");
		let inputField = document.getElementById("nffc");
		if (!inputField) return;

		// Ensure button isn't added multiple times
		if (document.getElementById("paste-btn")) return;

		// Find the factor-toggle div
		let toggleDiv = document.querySelector(".factor-toggle");
		if (!toggleDiv) return;

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

if (!window.__valueEdgeBeautifierInitialized) {
	// Scripts that don't need a mutation oberver
	runAuthRelatedScripts();

	// Avoid multiple re-injection
	window.__valueEdgeBeautifierInitialized = true;
	window.addEventListener("load", function () {
		const observer = new MutationObserver((mutationsList, observer) => {
			beautifyPhaseInUserStoryView();
			beautifyPhaseInBacklogView();
			beautifyPhaseInTeamBacklogView();

			// Make the labels in the ticket view more appealing and easier to find
			beautifyLabels();
		});

		// Start observing the document for changes
		observer.observe(document.body, { childList: true, subtree: true });

		// Disconnect the observer when the page unloads
		window.addEventListener("unload", function () {
			observer.disconnect();
		});
	});
}
