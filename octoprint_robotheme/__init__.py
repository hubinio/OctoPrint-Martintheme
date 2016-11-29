# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import flask
import socket



class robothemePlugin(octoprint.plugin.SettingsPlugin,
                    octoprint.plugin.TemplatePlugin,
                    octoprint.plugin.AssetPlugin,
                    octoprint.plugin.SimpleApiPlugin,
                    octoprint.plugin.StartupPlugin):

    def __init__(self):
        
        
        hostname = socket.gethostname() + ".local"
        self.printer_name = [hostname]

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


    def get_update_information(*args, **kwargs):
        return dict(
            robotheme=dict(
                type="github_release",
                user="Robo3D",
                repo="OctoPrint-robotheme",
                branch='master',
                pip="https://github.com/Robo3D/OctoPrint-robotheme/archive/"
                    "{target_version}.zip",
            )
        )

    def get_template_configs(self):
        return [
            dict(type="settings", name="Robo",
                 data_bind="visible: loginState.isAdmin()"),
        ]


def __plugin_load__():
    plugin = robothemePlugin()
    global __plugin_implementation__    
    __plugin_implementation__ = plugin

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        #"octoprint.comm.protocol.scripts": __plugin_implementation__.scripts_hook,
    }
