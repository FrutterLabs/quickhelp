from frappe.custom.doctype.custom_field.custom_field import create_custom_field


def execute():
    create_custom_field(
        "File",
        {
            "default": "0",
            "fieldname": "fsl_quickhelp",
            "read_only": 1,
            "fieldtype": "Check",
            "label": "For Quick Help",
            "insert_after": "uploaded_to_google_drive"
        }
    )
