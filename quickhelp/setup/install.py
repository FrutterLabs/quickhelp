# Copyright (c) 2024, Frutter Software Labs Private Limited and contributors
# For license information, please see license.txt

from quickhelp.setup.file import create_quickhelp_folder


def after_install():
    create_quickhelp_folder()
