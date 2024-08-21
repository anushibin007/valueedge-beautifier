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
		return "text-bg-warning";
	} else if (phaseText.includes("In Testing")) {
		return "text-bg-warning";
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

if (!window.__valueEdgeBeautifierInitialized) {
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
