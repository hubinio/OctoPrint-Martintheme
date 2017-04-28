# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import flask
import socket



class robothemePlugin(octoprint.plugin.SettingsPlugin,
                    octoprint.plugin.TemplatePlugin,
                    octoprint.plugin.AssetPlugin,
                    octoprint.plugin.SimpleApiPlugin,
                    octoprint.plugin.StartupPlugin,
                    octoprint.plugin.UiPlugin):

    def __init__(self):
        hostname = socket.gethostname() + ".local"
        self.printer_name = [hostname]

    def will_handle_ui(self, request):
        return True

    def on_ui_render(self, now, request, render_kwargs):
        from flask import make_response, render_template
        render_kwargs['now'] = now
        render_kwargs['gcodeThreshold'] = 20971520
        render_kwargs['gcodeMobileThreshold'] = 2097152
        t = """ :::These are the kwargs:::
        {}
        """.format(render_kwargs)
        self._logger.info(t)
        return make_response(render_template('index.jinja2', **render_kwargs))

    def get_settings_defaults(self):
        return dict(
            webcam=dict(
                enabled=False
                )
        )

    def get_assets(self):
        return dict(
            # js=['js/robotheme.js'],
            # css=['css/main.css'],
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

    def get_template_configs(self):
        return [
            dict(type="settings", name="Robo",
                 data_bind="visible: loginState.isAdmin()"),
        ]

    ##~~ Softwareupdate hook
    def get_update_information(self):
        return dict(
        robotheme=dict(
            displayName = "Robo Theme",
            displayVersion = self._plugin_version,

            type="github_release",
            user="Robo3D",
            repo="OctoPrint-robotheme",
            current=self._plugin_version,

            pip="https://github.com/Robo3D/OctoPrint-robotheme/archive/{target_version}.zip"
            )
        )

__plugin_name__ = "Robo Theme"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = robothemePlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config":__plugin_implementation__.get_update_information
    }
