# Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
# For license information, please see license.txt

import frappe
def set_bootinfo(bootinfo):
    quickhelp_settings = frappe.get_cached_doc("QuickHelp Settings")
    bootinfo["quickhelp_support_enabled"] = quickhelp_settings.enable_ticket
    bootinfo["quickhelp_max_file_size"] = quickhelp_settings.max_recording_size
    bootinfo["quickhelp_file_type"] = 1 if quickhelp_settings.save_recording == "Private" else 0
