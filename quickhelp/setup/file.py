# Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
# For license information, please see license.txt

import frappe

def create_quickhelp_folder():
	f = frappe.new_doc("File")
	f.file_name = "QuickHelp"
	f.is_folder = 1
	f.folder = "Home"
	f.insert(ignore_if_duplicate=True)