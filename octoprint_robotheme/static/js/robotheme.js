/*addin in a comment to test new releases*/
$(function() {
    function robothemeViewModel(parameters) {
        var self = this;
        self.temperature = parameters[0];
        self.terminal = parameters[1];
        self.files = parameters[2];
        self.settings = parameters[3];
        self.control = parameters[4];
        self.customControls = parameters[5];
        self.loginState = parameters[6];

        /* Modified from OctoPrint
         * Reason: Need to identify which custom controls are created by plugins
         */
        self.control.onAllBound = function(allViewModels) {
            var additionalControls = [];
            _.each(allViewModels, function(viewModel) {
                if (viewModel.hasOwnProperty("getAdditionalControls")) {
                    additionalControls = additionalControls.concat(viewModel.getAdditionalControls());
                    _.each(additionalControls, function(control) {
                        control.plugin_control = ko.observable(true);
                    });
                }
            });
            if (additionalControls.length > 0) {
                self.control.additionalControls = additionalControls;
                self.control.rerenderControls();
            }
        };

        /* Modified from OctoPrint
         * Reason: Need to give every control a plugin_control attribute to identify
         * which custom controls are created by plugins
         */
        self.oldProcess = self.control._processControl;
        self.control._processControl = function(control) {
            self.oldProcess(control);
            control.plugin_control = control.hasOwnProperty("plugin_control") ? ko.observable(true) : ko.observable(false);
            return control;
        };

        self.control._enableWebcam = function() {
            if (self.control.webcamDisableTimeout != undefined) {
                clearTimeout(self.control.webcamDisableTimeout);
            }
            var webcamImage = $("#webcam_image");
            var currentSrc = webcamImage.attr("src");
            if (currentSrc === undefined || currentSrc.trim() == "") {
                var newSrc = CONFIG_WEBCAM_STREAM;
                if (CONFIG_WEBCAM_STREAM.lastIndexOf("?") > -1) {
                    newSrc += "&";
                } else {
                    newSrc += "?";
                }
                newSrc += new Date().getTime();

                self.control.updateRotatorWidth();
                webcamImage.attr("src", newSrc);
            }
        };


        /* Modified from OctoPrint
         * Reason: Edit color options, as well as number of ticks, and min/max values
         */
        var flotColors = ["#fbc08d", "#fde0c8", "#ffb6a6", "#ffdbd4"];
        self.temperature.plotOptions = {
            grid: {
                show: true,
                aboveData: true,
                color: "#3f3f3f",
                labelMargin: 5,
                axisMargin: 0,
                borderWidth: 0,
                borderColor: null,
                minBorderMargin: 5,
                clickable: true,
                hoverable: true,
                autoHighlight: false,
                backgroundColor: "#fcfcfc"
            },
            series: {
                lines: {
                    show: true,
                    fill: false,
                    lineWidth: 2,
                    steps: false
                },
                points: {
                    show: false
                }
            },
            yaxis: {
                min: 0,
                max: 310,
                ticks: 10
            },
            xaxis: {
                mode: "time",
                minTickSize: [2, "minute"],
                tickFormatter: function(val, axis) {
                    if (val == undefined || val == 0)
                        return "";
                    var timestampUtc = Date.now();
                    var diff = timestampUtc - val;
                    var diffInMins = Math.round(diff / (60 * 1000));
                    if (diffInMins == 0)
                        return gettext("just now");
                    else
                        return "- " + diffInMins + " " + gettext("min");
                }
            },
            colors: flotColors,
            shadowSize: 1,
            tooltip: true,
            tooltipOpts: {
                content: "%s : %y.0",
                shifts: {
                    x: -30,
                    y: -50
                },
                defaultTheme: false
            }
        };

        self.hideToolTip = function() {
            $("#tooltip_bar, #tooltip").css("display", "none");
            if (typeof self.temperature.plot !== "undefined") self.temperature.plot.unhighlight();
        }

        self.customControls.onEventSettingsUpdated = function(payload) {
            $(".parsed-control").each(function() {
                if (!$(this).hasClass("plugin_control")) {
                    $(this).remove();
                }
            });
            self.customControls.requestData();
        }

        /* Modified from OctoPrint
         * Reason: Remove temperature from label as well as renaming tool "T" to "Hotend"
         * and to apply our own colors
         */
        self.temperature.updatePlot = function() {
            var graph = $("#temperature-graph");
            if (graph.length) {
                var data = [];
                var heaterOptions = self.temperature.heaterOptions();
                if (!heaterOptions) return;

                _.each(_.keys(heaterOptions), function(type) {
                    if (type == "bed" && !self.temperature.hasBed()) {
                        return;
                    }

                    var actuals = [];
                    var targets = [];

                    if (self.temperature.temperatures[type]) {
                        actuals = self.temperature.temperatures[type].actual;
                        targets = self.temperature.temperatures[type].target;
                    }

                    var actualTemp = actuals && actuals.length ? formatTemperature(actuals[actuals.length - 1][1]) : "-";
                    var targetTemp = targets && targets.length ? formatTemperature(targets[targets.length - 1][1]) : "-";

                    if (heaterOptions[type].name == "T") {
                        heaterOptions[type].name = "Hotend";
                    } else if (heaterOptions[type].name == "Bed") {
                        heaterOptions[type].name = "Build Plate";
                    }

                    /* Below, we edit the label by not including actualTemp or targetTemp */
                    data.push({
                        label: gettext("Actual") + " " + heaterOptions[type].name,
                        data: actuals,
                        lines: {
                            fillColor: "#f3faff"
                        }
                    });
                    data.push({
                        label: gettext("Target") + " " + heaterOptions[type].name,
                        data: targets,
                        lines: {
                            fillColor: "#fff8f7"
                        }
                    });
                });

                /* Hide tooltip and overlay bar every time we update the plot */
                self.temperature.plot = $.plot(graph, data, self.temperature.plotOptions);
                self.hideToolTip();
            }
        };

        self.onAllBound = function() {
            // Add ToS link
            $(".footer .pull-right").append(
                "<li><a href='http://www.robo3d.com/terms-and-conditions' target='_blank'>Terms and Conditions</a></li>"
            );


            $("#settings_dialog_label").text("Settings");
            document.title = "Robo";
            $("#navbar .brand").html("<img src='/plugin/robotheme/static/logo.png' />");


            $(".temperature-height").click(function() {
                $(".temperature-height").toggleClass("active");
                $("#temperature-graph").animate({
                    height: ($("#temperature-graph").height() == 250) ? 500 : 250
                }, {
                    duration: 250,
                    step: function() {
                        self.temperature.updatePlot();
                    }
                });
                $("#tooltip_bar").animate({
                    height: ($("#temperature-graph").height() == 250) ? 485 : 235
                }, 250);
            });

            var legends = $("#temperature-graph .legendLabel");
            legends.each(function() {
                $(this).css('width', $(this).width());
            });

            // Legend/tooltip for Flot chart
            var updateLegendTimeout = null;
            var latestPosition = null;

            function updateLegend() {
                updateLegendTimeout = null;
                self.hideToolTip();
                var pos = latestPosition,
                    axes = self.temperature.plot.getAxes();
                if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max || pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) return;
                var dataset = self.temperature.plot.getData();
                if (dataset.length <= 0 || typeof dataset[0].data[1] === "undefined") return;
                var halfDist = (dataset[0].data[1][0] - dataset[0].data[0][0]) / 2;
                $("#tooltip tbody").empty();
                for (var i = 0; i < dataset.length; i++) {
                    var series = dataset[i];
                    for (j = 0; j < series.data.length; j++) {
                        if (series.data[j][0] - halfDist > pos.x) {
                            break;
                        }
                    }
                    self.temperature.plot.highlight(i, j - 1);
                    $("#tooltip_bar").css({
                        "display": "block",
                        "left": axes.xaxis.p2c(series.data[j - 1][0]) + 21
                    });
                    $("#tooltip").css({
                        "display": "block",
                        "left": "55px",
                        "right": "auto",
                        "top": Math.ceil((pos.pageY - $("#temperature-graph").offset().top - 40) / 50.0) * 50
                    });
                    legends.eq(i).text(series.label.replace(/=.*/, "= " + series.data[j - 1][1].toFixed(2)));
                    $("#tooltip tbody").append(
                        $('<tr>').append(
                            $('<td><div class="bulletColor" style="background-color: ' + series.color + '"></div></td><td class="key">' + series.label + '</td><td class="value">' + series.data[j - 1][1] + '</td>')
                        ))
                    if ($("#temperature-graph").width() - ($("#tooltip").width() + $("#tooltip_bar").position().left + $("#tooltip").position().left) < 0) {
                        $("#tooltip").css({
                            "right": "55px",
                            "left": "auto"
                        });
                    }
                    if (($("#temperature-graph").offset().top + $("#temperature-graph").height()) < ($("#tooltip").offset().top + $("#tooltip").height())) {
                        $("#tooltip").css("top", "-=75");
                    }
                }
            }
            $("#temperature-graph").bind("plothover", function(event, pos, item) {
                latestPosition = pos;
                if (!updateLegendTimeout) {
                    updateLegendTimeout = setTimeout(updateLegend, 50);
                }
            });
            $(window).resize(function() {
                self.temperature.updatePlot();
            });
            $("#temperature_main").mouseleave(function() {
                self.hideToolTip();
            });
            $("#navbar ul, #navbar li").mouseenter(function() {
                self.hideToolTip();
            });

            $(".nav-collapse").addClass("collapse");
            $(".btn-navbar").click(function() {
                $(".octoprint-container .span4").first().toggleClass("mt0");
            });

            $("#temperature_wrapper .media").click(function() {
                $("#temperature_wrapper .media").removeClass("active");
                $(this).addClass("active");
            });
            $('head').append("<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />");

            var element, equipmentName, elementSidebar, elementActual, elementTarget, elementOffset;
            $("#temperature_wrapper .table-bordered tbody tr").each(function() {
                element = $(this);
                equipmentName = element.find("th").first().text();
                elementActual = element.find("td:eq(0)");
                elementTarget = element.find("td:eq(1)");
                elementOffset = element.find("td:eq(2)");
                if (equipmentName == "Hotend") {
                    elementActual.appendTo(".hotend_temp");
                    elementTarget.appendTo("#hotend_temp .hotend_target");
                    elementOffset.appendTo("#hotend_temp .hotend_offset");
                } else if (equipmentName == "Bed") {
                    elementActual.appendTo(".bed_temp");
                    elementTarget.appendTo("#bed_temp .bed_target");
                    elementOffset.appendTo("#bed_temp .bed_offset");
                }
            });

            var tempButton;
            $(".hotend_target .dropdown-menu li").each(function() {
                tempButton = $(this).find("a");
                if (tempButton.text().indexOf('(') !== -1) {
                    tempLabel = tempButton.text().match(/\(([^)]+)\)/)[1];
                    tempButton.text(tempButton.text().replace(tempLabel, "").replace(/ |\(|\)/g, ""));
                } else {
                    tempLabel = "Off"
                }
                tempButton.text(tempButton.text().replace(/Set/g, ""));
                tempButton.wrapInner("<button class='btn' title='" + tempLabel + "'></button>").appendTo("#hotend_temp .btn-spread");
            });
            $(".bed_target .dropdown-menu li").each(function() {
                tempButton = $(this).find("a");
                if (tempButton.text().indexOf('(') !== -1) {
                    tempLabel = tempButton.text().match(/\(([^)]+)\)/)[1];
                    tempButton.text(tempButton.text().replace(tempLabel, "").replace(/ |\(|\)/g, ""));
                } else {
                    tempLabel = "Off"
                }
                tempButton.text(tempButton.text().replace(/Set/g, ""));
                tempButton.wrapInner("<button class='btn' title='" + tempLabel + "'></button>").appendTo("#bed_temp .btn-spread");
            });
            $(".hotend_target button.dropdown-toggle, .hotend_target .dropdown-menu").remove();
            $(".bed_target button.dropdown-toggle, .bed_target .dropdown-menu").remove();
            $("#temperature_main table.table-bordered").remove();

            $(".btn-spread").tooltip({
                position: {
                    my: "left top+10",
                    at: "center-15 bottom",
                    collision: "flipfit"
                }
            });


            $(".navbar-inner .nav-collapse, .btn-navbar").after("<div class='pull-left-container'><ul class='nav pull-left'><li><span class='printer_name_span'></span></li></ul></div>");
            $(".btn-navbar").wrap("<div class='btn-nav-container'></div>");
            $.ajax({
                type: "GET",
                url: "/api/plugin/robotheme",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(response) {
                    if (response.printer_name && response.printer_name != "") {
                        self.setPrinterName(response.printer_name);
                    } else {
                        self.hidePrinterName();
                    }
                },
                error: function(jqXHR, exception) {
                    self.hidePrinterName();
                }
            });
        };

        self.onAfterTabChange = function(current, previous) {
            if (current != "#control") {
                return;
            }
            self.temperature.updatePlot();
        }

        self.onStartupComplete = function() {
            self.parseCustomControls();

            $('<div class="panel-footer pn bt0"><div class="row-fluid table-layout"><div class="span4 panel-sidemenu border-right control-panel-left"></div><div class="span8 p15 pt20 control-panel-right"></div></div></div>').prependTo("#control_main");
            $('#control .jog-panel').first().appendTo(".control-panel-left");
            $('#control .jog-panel').each(function() {
                $(this).appendTo(".control-panel-right");
            });
            $(".control-panel-left h1").each(function(i, em) {
                $(em).replaceWith('<h2>' + $(em).html() + '</h2>');
            });
            $(".control-panel-right h1").each(function(i, em) {
                $(em).replaceWith('<h4>' + $(em).html() + '</h4>');
            });
            $("#terminal_main small.pull-left span").css({
                "display": "block",
                "text-align": "right"
            }).appendTo("#terminal_main small.pull-right");
            $(".sd-trigger a:first").html('<i class="icon-file"></i>');
            $("#temp").remove();
            $("#term").remove();

            // Manage extra contents of .tab-content
            var tabContentHTML = $(".main-content-wrapper").html().replace(/<!-- ko allowBindings: false -->|<!-- \/ko -->|<!-- ko allowBindings: true -->/g, "");

            if (typeof localStorage["robo.gcodeFiles.currentSorting"] === "undefined") {
                self.currentSorting = "upload";
                localStorage["robo.gcodeFiles.currentSorting"] = self.currentSorting;
                self.files.listHelper.changeSorting(self.currentSorting);
            }
            self.control._enableWebcam();
        };

        self.oldControl = self.customControls.rerenderControls;
        self.customControls.rerenderControls = function() {
            self.oldControl();
            self.parseCustomControls();
        }

        // Print Completion popup

        self.onEventPrintDone = function(payload) {
            if (typeof Notification === 'undefined') {
                console.log('Desktop notifications not available in your browser. Try Chromium.');
                return;
            }
            if (Notification.permission !== "granted")
                Notification.requestPermission();
            else {
                var timeInSecs = payload.time;
                var hours = Math.floor(timeInSecs / 3600);
                timeInSecs = timeInSecs % 3600;
                var minutes = Math.floor(timeInSecs / 60);
                timeInSecs = timeInSecs % 60;
                var seconds = timeInSecs;
                var notification = new Notification(payload.filename + ' - Print Complete', {
                    icon: '~/Octoprint-robotheme/octoprint-robotheme/static/logo.png',
                    body: "Your print is complete after " + hours + " hour(s), " + minutes + " minute(s), and " + seconds + " second(s).",
                });
                notification.onclick = function() {
                    window.focus();
                    notification.close();
                };
            }
        }

        // Display printer serial name in header

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin === "robotheme") {
                if (data.printer_name) {
                    self.setPrinterName(data.printer_name);
                } else {
                    self.hidePrinterName();
                }
            }
        }

        self.setPrinterName = function(printerName) {
            if (document.title !== "Robo") {
                document.title = printerName + " \u2016 Robo";
            } else {
                document.title = printerName + " \u2013 " + document.title;
            }
            $(".printer_name_span").text(printerName);
            $(".nav.pull-left").css("display", "block");
        }

        self.hidePrinterName = function() {
            document.title = "Robo";
            $(".nav.pull-left").css("display", "none");
        }
    }

    OCTOPRINT_VIEWMODELS.push([
        robothemeViewModel, ["temperatureViewModel", "terminalViewModel", "gcodeFilesViewModel", "settingsViewModel", "controlViewModel", "customControlViewModel", "loginStateViewModel"],
        ["#settings_plugin_robotheme"]
    ]);
});

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Notification === 'undefined')
        return;
    if (Notification.permission !== "granted")
        Notification.requestPermission();
});

function checkWidth() {
    if ($(window).width() > 767) {
        $(".octoprint-container .span4").first().removeClass("mt0");
    } else if ($(window).width() <= 767 && $(".nav-collapse").hasClass("in")) {
        $(".octoprint-container .span4").first().addClass("mt0");
    }
}

$(window).resize(function() {
    checkWidth();
});
