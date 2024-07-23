# Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import cint, flt, get_url, now
from frappe.utils.safe_exec import get_safe_globals, safe_eval
from quickhelp.utils.requests import make_request
from typing import Optional

@frappe.whitelist()
def create_ticket(title: str, raised_by: str, ticket_module: str, description: str, screen_recording: Optional[str] = None) -> str:
    """Create a new ticket with or without a screen recording attachment."""
    settings = frappe.get_cached_doc("QuickHelp Settings")
    frappe.errprint(settings.get_password('support_api_token'))
    headers = {
        "Authorization": f"token {settings.get_password('support_api_token')}",
    }
    frappe.errprint(headers)
    hd_ticket_file = upload_screen_recording(settings, screen_recording) if screen_recording else None

    payload = {
        "doc": {
            "description": description,
            "raised_by": raised_by,
            "subject": title,
            # "custom_module": ticket_module,
            **generate_ticket_details(settings),
        },
        "attachments": [hd_ticket_file] if hd_ticket_file else [],
    }
    frappe.errprint(payload)
    response = make_request(
        url=f"{settings.support_url}/api/method/helpdesk.helpdesk.doctype.hd_ticket.api.new",
        headers=headers,
        payload=payload
    )

    return response.get("message", {}).get("name", "")

def upload_screen_recording(settings, screen_recording: str) -> str:
    """Upload screen recording and return the file link."""
    screen_recording_url = f"{get_url()}{screen_recording}"
    response = make_request(
        url=f"{settings.support_url}/api/method/upload_file",
        headers={"Authorization": f"token {settings.get_password('support_api_token')}"},
        payload={"file_url": screen_recording_url}
    )
    return response.get("message")

def generate_ticket_details(settings) -> dict:
    """Generate additional ticket details based on settings configuration."""
    req_params = {}
    for row in settings.ticket_details:
        value = safe_eval(row.value, get_safe_globals(), {}) if row.type == "Context" else row.value
        req_params[row.key] = {
            "Int": cint,
            "String": str,
            "Float": flt,
        }.get(row.cast_to, lambda x: x)(value)

    return req_params

def upload_file(content: bytes) -> str:
    """Upload a file to Frappe and return the URL."""
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": frappe.scrub(f"ST_{frappe.session.user}_{now()}.mp4"),
        "is_private": False,
        "content": content,
        "decode": True,
    })
    file_doc.save(ignore_permissions=True)
    return f"{get_url()}{file_doc.file_url}"
