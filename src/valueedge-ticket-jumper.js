// ValueEdge Ticket Jumper - Browser Extension
// Listens for Alt+V hotkey and opens a modal to jump to tickets

class TicketJumper {
	constructor() {
		this.modal = null;
		this.apiEndpoint = null;
		this.loadConfig();
		this.init();
	}

	loadConfig() {
		const saved = localStorage.getItem("valueedge-api-endpoint");
		this.apiEndpoint = saved || null;
	}

	saveConfig(endpoint) {
		this.apiEndpoint = endpoint;
		localStorage.setItem("valueedge-api-endpoint", endpoint);
	}

	init() {
		document.addEventListener("keydown", (e) => {
			if (e.altKey && e.key === "v") {
				e.preventDefault();
				this.showModal();
			}
		});
	}

	showModal() {
		if (this.modal) return;

		this.modal = document.createElement("div");
		this.modal.innerHTML = `
            <div id="ticket-jumper-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div id="ticket-jumper-modal" style="background: white; padding: 24px; border-radius: 8px; min-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="margin: 0; font-family: sans-serif;">Jump to Ticket</h4>
                        <button id="config-btn" style="background: none; border: none; cursor: pointer; font-size: 18px;">⚙️</button>
                    </div>
                    <div id="main-view">
                        ${
							this.apiEndpoint
								? `
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <input type="text" id="ticket-id-input" placeholder="Enter JIRA / ValueEdge / Global ID" style="flex: 1; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
                                <button id="go-btn" style="background: #3498db; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-weight: bold;">Go</button>
                            </div>
                            <div id="error-msg" style="color: red; margin-top: 8px; font-family: sans-serif; font-size: 12px; display: none;"></div>
                            <div id="spinner" style="display: none; text-align: center; margin-top: 16px;">
                                <div style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                            </div>
                        `
								: `
                            <p style="font-family: sans-serif; color: #666; margin: 0;">Please configure the ve-inator backend API endpoint first by clicking the gear icon.</p>
                        `
						}
                    </div>
                    <div id="config-view" style="display: none;">
                        <label style="font-family: sans-serif; font-size: 14px; display: block; margin-bottom: 8px;">ve-inator backend API Endpoint root:</label>
                        <input type="text" id="endpoint-input" required value="${
							this.apiEndpoint || ""
						}" placeholder="https://your-server/ve-inator-backend" style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-bottom: 12px;" />
                        <button id="save-config-btn" style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: sans-serif;">Save</button>
                        <button id="cancel-config-btn" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: sans-serif; margin-left: 8px;">Cancel</button>
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

		document.body.appendChild(this.modal);
		this.attachEventListeners();
	}

	attachEventListeners() {
		const overlay = document.getElementById("ticket-jumper-overlay");
		const configBtn = document.getElementById("config-btn");
		const ticketInput = document.getElementById("ticket-id-input");
		const goBtn = document.getElementById("go-btn");
		const saveConfigBtn = document.getElementById("save-config-btn");
		const cancelConfigBtn = document.getElementById("cancel-config-btn");

		overlay.addEventListener("click", (e) => {
			if (e.target.id === "ticket-jumper-overlay") {
				this.closeModal();
			}
		});

		configBtn?.addEventListener("click", () => this.showConfigView());
		saveConfigBtn?.addEventListener("click", () => this.saveConfigView());
		cancelConfigBtn?.addEventListener("click", () => this.hideConfigView());

		goBtn?.addEventListener("click", () => {
			if (ticketInput) {
				this.handleTicketSubmit(ticketInput.value.trim());
			}
		});

		ticketInput?.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				this.handleTicketSubmit(ticketInput.value.trim());
			}
		});

		ticketInput?.focus();
	}

	showConfigView() {
		document.getElementById("main-view").style.display = "none";
		document.getElementById("config-view").style.display = "block";
		document.getElementById("endpoint-input").focus();
	}

	hideConfigView() {
		document.getElementById("config-view").style.display = "none";
		document.getElementById("main-view").style.display = "block";
	}

	saveConfigView() {
		const endpoint = document.getElementById("endpoint-input").value.trim();
		if (endpoint) {
			this.saveConfig(endpoint);
			this.closeModal();
			this.showModal(); // Refresh modal with new config
		}
	}

	getEntityType(searchData) {
		// we need to return "task" entity type ONLY for task type of tickets
		if (searchData?.type === "task") {
			return "task";
		} else {
			return "work_item";
		}
	}

	async handleTicketSubmit(ticketId) {
		if (!ticketId) return;

		const spinner = document.getElementById("spinner");
		const errorMsg = document.getElementById("error-msg");
		const input = document.getElementById("ticket-id-input");

		spinner.style.display = "block";
		errorMsg.style.display = "none";
		input.disabled = true;

		try {
			const url = `${this.apiEndpoint}/api/v1/findByAnyTicketId?id=${ticketId}`;
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();

				const total_count = data?.total_count;

				if (!total_count) {
					throw new Error(`No ValueEdge ticket with ${ticketId} found`);
				}
				const searchData = data.data[0];

				const ticketGlobalId = searchData.id;
				const baseUrl =
					window.location.origin + window.location.pathname + window.location.search;
				const targetUrl = `${baseUrl}#/entity-navigation?entityType=${this.getEntityType(
					searchData
				)}&id=${ticketGlobalId}`;

				if (targetUrl) {
					window.open(targetUrl, "_blank");
					this.closeModal();
				} else {
					throw new Error("No URL found in response");
				}
			} else {
				throw new Error(`API returned ${response.status}: ${response.statusText}`);
			}
		} catch (error) {
			errorMsg.textContent = `Error: ${error.message}`;
			errorMsg.style.display = "block";
			spinner.style.display = "none";
			input.disabled = false;
			input.focus();
		}
	}

	closeModal() {
		if (this.modal) {
			this.modal.remove();
			this.modal = null;
		}
	}
}

// Initialize the ticket jumper
new TicketJumper();
