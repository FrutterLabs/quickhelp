// Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
// For license information, please see license.txt
// Recording part referrenced from https://github.com/TylerPottsDev/yt-js-screen-recorder

frappe.provide("quickhelp");

quickhelp.chunks = [];
quickhelp.blob = null;
quickhelp.blobURL = null;

quickhelp.SupportTicket = class SupportTicket {
	constructor() {
		if (!frappe.boot.quickhelp_support_enabled) {
			frappe.msgprint(__("Support is not enabled for this site. Please contact Administrator."));
			return;
		}
		this.init_config();
		this.setup_dialog();
		this.dialog.show();
	}

	setup_dialog() {
		this.dialog = new frappe.ui.Dialog({
			title: __("Create Support Ticket"),
			size: "large",
			minimizable: true,
			static: true,
			fields: [
				{
					fieldname: "ticket_title",
					label: __("Subject"),
					fieldtype: "Data",
					reqd: 1
				},
				{
					fieldname: "ticket_module",
					label: __("Module"),
					fieldtype: "Select",
					options: "\nAccounts\nBuying\nSelling\nStock\nHRMS\nProject\nAsset",
					reqd: 1
				},
				{
					fieldname: "ticket_description",
					label: __("Description"),
					fieldtype: "Text Editor",
					reqd: 1
				},
				{
					fieldtype: "Section Break",
					label: __("Screen Recording")
					
				},
				// {
				// 	fieldname: "record_screen",
				// 	label: __("Start Recording"),
				// 	fieldtype: "Button",
				// 	hidden: 1,
				// 	click: () => {
				// 		if (this.recorder && this.recorder.state == "recording") {
				// 			this.stopRecording();
				// 		} else {
				// 			this.startRecording();
				// 		}
				// 	}
				// },
				{ fieldtype: "Column Break" },
				{
					fieldname: "view_recording",
					label: __("View Recording"),
					fieldtype: "Button",
					hidden: 1,
					click: () => {
						window.open(quickhelp.blobURL, "_blank");
					}
				},
				{
					fieldname: "clear_recording",
					label: __("Clear Recording"),
					fieldtype: "Button",
					hidden: 1,
					click: () => {
						if (this.recorder && this.recorder.state == "recording") {
							frappe.show_alert({
								indicator: "red",
								message: __("Please stop the recording before clearing.")
							});
							return;
						}

						quickhelp.chunks = [];
						quickhelp.blob = null;
						quickhelp.blobURL = null;

						this.dialog.set_df_property("record_screen", "label", "Start Recording")
						this.dialog.set_df_property("view_recording", "hidden", 1);
						this.dialog.set_df_property("clear_recording", "hidden", 1);

						frappe.show_alert({
							indicator: "green",
							message: __("Screen recording have been cleared.")
						});
					}
				}
			],
			primary_action_label: __("Create Ticket"),
			primary_action: (values) => {
				if (this.recorder && this.recorder.state == "recording") {
					frappe.show_alert({
						indicator: "red",
						message: __("Please stop the recording before creating the ticket.")
					});
					return;
				}
				this.raise_ticket(values);
			},
			secondary_action_label: __("Cancel"),
			secondary_action: () => {
				if (this.recorder && this.recorder.state == "recording") {
					frappe.show_alert({
						indicator: "red",
						message: __("Please stop the recording before cancelling.")
					});
					return;
				}
				this.dialog.hide();
			}
		});

		this.dialog.$wrapper.find(".modal-dialog").css("z-index", 1);
		this.dialog.get_minimize_btn().addClass("pr-3");
	}

	setIndicator(indicator) {
		this.dialog.header
			.find(".indicator")
			.css({ width: "1rem", height: '1rem'})
			.removeClass()
			.addClass("indicator " + (indicator || "hidden"));
	}

	async raise_ticket(values) {
		console.log('Correct js')
		console.log(this.inUpload)
		if (this.inUpload) return;

		this.inUpload = true;
		let screen_recording = null;
		if (quickhelp.blob) {
			frappe.show_alert({
				indicator: "yellow",
				message: __("Raising ticket. Please wait..."),
			})
			screen_recording = await this.blobToBase64(quickhelp.blob);
			screen_recording = await quickhelp.UploadFile(quickhelp.blob);
			if (!screen_recording) {
				frappe.show_alert({
					indicator: "red",
					message: __("Error Creating Ticket. Please try again."),
				})
				this.inUpload = false;
				return;
			}
		}

		this.inUpload = false;
		
		frappe.call({
			method: "quickhelp.utils.support.create_ticket",
			type: "POST",
			args: {
				"title": values.ticket_title,
				'raised_by': frappe.session.user,
				"ticket_module": values.ticket_module,
				"description": values.ticket_description,
				"screen_recording": screen_recording
			},
			freeze: true,
			freeze_message: __("Creating ticket..."),
			callback: (r) => {
				if (!r.exc && r.message) {
					frappe.show_alert({
						indicator: "green",
						message: __("Ticket created successfully"),
					});
					this.dialog.hide();
					frappe.msgprint(
						__(`Your ticket(#${r.message}) has been created successfully. You will be notified once it is resolved.`)
					)
				}
			}
		});
	}

	init_config() {
		this.stream = null;
		this.audio = null;
		this.mixedStream = null;
		this.recorder = null;
		this.recordedVideo = null;
		this.inUpload = false;

		quickhelp.chunks = [];
		quickhelp.blob = null;
		quickhelp.blobURL = null;

		this.maxFileSizeInBytes = frappe.boot.quickhelp_max_file_size * 1024 * 1024;
		this.sizeWarning = (frappe.boot.quickhelp_max_file_size / 4) * 1024 * 1024;
		this.nextWarningSize = this.sizeWarning;
	}

	async setupStream() {
		try {
			this.stream = await navigator.mediaDevices.getDisplayMedia({
				video: true
			});

			this.audio = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 44100,
				},
			});
		} catch (err) {
			console.error(err)
		}
	}

	async startRecording() {
		await this.setupStream();

		if (this.stream && this.audio) {
			quickhelp.chunks = [];
			this.mixedStream = new MediaStream([...this.stream.getTracks(), ...this.audio.getTracks()]);
			this.recorder = new MediaRecorder(this.mixedStream);
			this.recorder.ondataavailable = (e) => {
				quickhelp.chunks.push(e.data);
				this.checkFileSize();
			};
			this.recorder.onstop = this.handleStop;
			this.recorder.start(1000);
			console.log('Recording started');

			this.setIndicator("spinner-grow text-danger align-self-center mr-2");
			this.dialog.set_df_property("record_screen", "label", "Stop Recording");
			this.dialog.set_df_property("view_recording", "hidden", 1);
			this.dialog.set_df_property("clear_recording", "hidden", 1);
			frappe.show_alert({
				indicator: "green",
				message: __(`Screen recording has started. Please click on "Stop Recording" once you are done.`)
			})
		} else {
			console.warn('No stream available.');
			frappe.show_alert({
				indicator: "red",
				message: __("Error starting screen recording. Please try again.")
			});
		}
	}

	stopRecording() {
		this.recorder.stop();
		this.setIndicator();
		this.dialog.set_df_property("record_screen", "label", "Start Recording")
		this.dialog.set_df_property("view_recording", "hidden", 0);
		this.dialog.set_df_property("clear_recording", "hidden", 0);
		frappe.show_alert({
			indicator: "green",
			message: __(`Screen recording has stopped. Please click on "View Recording" to view the recording.`)
		})
	}

	checkFileSize() {
		const totalSize = quickhelp.chunks.reduce((acc, chunk) => acc + chunk.size, 0);

		if (totalSize >= this.maxFileSizeInBytes) {
			frappe.show_alert({
				indicator: "red",
				message: __("Screen recording size has exceeded the maximum allowed size. Recording has been stopped.")
			});
			this.stopRecording();
			return;
		}


		if (totalSize >= this.nextWarningSize) {
			frappe.show_alert({
				indicator: "yellow",
				message: __(`Screen recording size has exceeded ${(totalSize / (1024 * 1024)).toFixed(1)}MB.`)
			});
			this.nextWarningSize += this.sizeWarning;
		}
	}

	handleStop(e) {
		quickhelp.blob = new Blob(quickhelp.chunks, { 'type': 'video/mp4' });
		quickhelp.blobURL = URL.createObjectURL(quickhelp.blob);

		this.stream.getTracks().forEach((track) => track.stop());
		this.audio && this.audio.getTracks().forEach((track) => track.stop());

		console.log('Recording stopped');
	}

	blobToBase64(blob) {
		// Taken from https://stackoverflow.com/a/18650249
		return new Promise((resolve, _) => {
			let reader = new FileReader();
			reader.onloadend = function () {
				let dataUrl = reader.result;
				let base64 = dataUrl.split(',')[1];
				resolve(base64)
			};
			reader.readAsDataURL(blob);
		});
	}
}
