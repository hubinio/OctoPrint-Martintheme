# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import flask


class robothemePlugin(octoprint.plugin.SettingsPlugin,
                    octoprint.plugin.TemplatePlugin,
                    octoprint.plugin.AssetPlugin,
                    octoprint.plugin.SimpleApiPlugin,
                    octoprint.plugin.StartupPlugin):

    printer_name = ['hostname']

    def get_settings_defaults(self):
        return dict(
            webcam=dict(
                enabled=False
                )
        )

    def get_assets(self):
        return dict(
            js=['js/robotheme.js'],
            css=['css/main.css'],
        )

    def get_api_commands(self):
        return dict(
            update_printer_name=[]
        )

    def on_api_command(self, command, data):
        if command == "update_printer_name":
            self.printer_name = data.get("printer_name")
            self._plugin_manager.send_plugin_message(
                self._identifier, dict(printer_name=self.printer_name))

    def on_api_get(self, request):
        return flask.jsonify(printer_name=self.printer_name)

    # Handles turning off pneumatic devices when print is paused or cancelled
    # Returns in the form (prefix, postfix)
    def scripts_hook(self, comm, script_type, script_name, *args, **kwargs):
        if (not script_type == "gcode" or
           script_name not in ["afterPrintCancelled", "afterPrintPaused"]):
            return None

        return ["M42 P2 S0", "M42 P75 S0"], None

    def get_update_information(*args, **kwargs):
        return dict(
            robotheme=dict(
                type="github_commit",
                user="AllenMcAfee",
                repo="OctoPrint-robotheme",
                branch='master',
                pip="https://github.com/AllenMcAfee/OctoPrint-robotheme/archive/"
                    "{target_version}.zip",
            )
        )

    def get_template_configs(self):
        return [
            dict(type="settings", name="Robo",
                 data_bind="visible: loginState.isAdmin()"),
        ]


def __plugin_load__():
    global __plugin_implementation__
    global __plugin_hooks__
    __plugin_implementation__ = robothemePlugin()

    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config":
            __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.scripts":
            __plugin_implementation__.scripts_hook,
    }
