import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.custom.doctype.property_setter.property_setter import make_property_setter



def execute():
    # Check if the Navbar Settings doctype exists
    if not frappe.db.exists("DocType", "Navbar Settings"):
        return

    # Get the Navbar Settings doctype
    navbar_settings = frappe.get_doc("Navbar Settings")
            
    # Add a new row to the help_dropdown child table
    navbar_settings.append("help_dropdown", {
        "item_label": "Open Helpdesk Portal",
        "item_type": "Route",
        "route": "https://support.frutterlabs.com/helpdesk/my-tickets"
    })

    # Save the changes
    navbar_settings.save()
