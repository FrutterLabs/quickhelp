// Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
// For license information, please see license.txt

frappe.provide("quickhelp");

quickhelp.UploadFile = function (file) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('loadstart', (e) => {
            frappe.show_alert({
                indicator: 'green',
                message: __('Uploading file.')
            })
        })
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                console.log(`Upload in progress. ${e.loaded} / ${e.total}`)
                frappe.show_progress("Uploading", e.loaded, e.total, "", true);
            }
        })
        xhr.addEventListener('error', (e) => {
            frappe.show_alert({
                indicator: 'red',
                message: __('Error uploading file.')
            })
            console.log(e);
            reject();
        })
        xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    let r = null;
                    let file_doc = null;
                    try {
                        r = JSON.parse(xhr.responseText);
                        if (r.message.doctype === 'File') {
                            file_doc = r.message;
                        }
                    } catch (e) {
                        console.log(xhr.responseText);
                        frappe.show_alert({
                            indicator: 'red',
                            message: __('Error uploading file.')
                        })
                        reject();
                    }
                    resolve(file_doc.file_url);
                } else {
                    let error = null;
                    try {
                        error = JSON.parse(xhr.responseText);
                        console.log(error)
                    } catch (e) {
                        // pass
                        console.log(xhr.responseText)
                    }
                    frappe.show_alert({
                        indicator: 'red',
                        message: __('Error uploading file.')
                    })
                    reject();
                }
            }
        }
        xhr.open('POST', '/api/method/upload_file', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);

        let form_data = new FormData();
        form_data.append('file', file, `screen-rec-${Date.now()}.mp4`);
        form_data.append('is_private', frappe.boot.quickhelp_file_type);
        form_data.append('folder', 'Home/QuickHelp');

        xhr.send(form_data);
    });
}