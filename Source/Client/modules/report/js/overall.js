var buttons_pre_row = 5
var default_shown_days = 21
const reducer = (accumulator, currentValue) => accumulator + currentValue;
var titleMap = {
    "overall-CateTimes-areaChart": "Top-10 網站類型造訪次數圖",
    "overall-DomainTimes-areaChart": "Top-10 網站造訪次數圖"
}

// For Store data from server
var data_bag = {};

chrome.storage.local.get(["debug"], function (v) {
    if (v.debug) {
        $("#debug_info").show()
        nextSendTimer = setInterval(function() {
            chrome.storage.sync.get(["dart_last_history_timestamp", "dart_scheduled_collect_period", 'dart_bookmarks_updated'], function(v) {
                $("#background-stat-nextSend").text(Math.round(v.dart_scheduled_collect_period * 60 - (Date.now() - v.dart_last_history_timestamp) / 1000) + "秒")
                var timeConverter = function(Chrome_timestamp) {
                        var a = new Date(Chrome_timestamp);
                        var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
                        var year = a.getFullYear();
                        var month = months[a.getMonth()];
                        var day = "0" + a.getDate();
                        var hour = a.getHours();
                        var min = "0" + a.getMinutes();
                        var sec = "0" + a.getSeconds();
                        var time = year + '-' + month + '-' + day.substr(-2) + ' ' + hour + ':' + min.substr(-2) + ':' + sec.substr(-2);
                        return time;
                    }
                $("#background-stat-history").text(timeConverter(v.dart_last_history_timestamp))
                $("#background-stat-BM").text(((v.dart_bookmarks_updated) ? "已同步" : "尚未同步"))
            })
            chrome.storage.local.get(['BGstat'], function (v) {
                if (typeof(v.BGstat) == "boolean") {
                    $("#background-stat-working").text("等待伺服器完成儲存⋯⋯")
                }
                else {
                    var task = {
                        1: "取得用戶資訊",
                        2: "取得最新瀏覽資訊",
                        3: "取得書籤資訊",
                        5: "取得瀏覽行為串流資訊",
                    }
                    txt = ""
                    for (var i = 0; i < v.BGstat.length; i++) {
                        if (i > 0) {
                            txt += "、"
                        }
                        txt += task[v.BGstat[i]]
                    }
                    if (txt.length > 0) {
                        $("#background-stat-working").text(txt)
                    }
                    else {
                        $("#background-stat-working").text("無進行中工作")
                    }
                }
            })
        }, 1000);
    }
})

$(document).ready(function() {
    /********************
     * Materialize Init *
     ********************/

    $('.card-toolbar-actions .dropdown-trigger').dropdown({
        constrainWidth: false,
    });

    M.AutoInit();
    /* End Materialize Init */

    chrome.storage.sync.get(["dart_userID", "dart_bookmarks_updated", "dart_last_history_timestamp", "dart_scheduled_collect_period"], function(v) {
        var timeConverter = function(Chrome_timestamp) {
            var a = new Date(Chrome_timestamp);
            var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            var year = a.getFullYear();
            var month = months[a.getMonth()];
            var day = "0" + a.getDate();
            var hour = a.getHours();
            var min = "0" + a.getMinutes();
            var sec = "0" + a.getSeconds();
            var time = year + '-' + month + '-' + day.substr(-2) + ' ' + hour + ':' + min.substr(-2) + ':' + sec.substr(-2);
            return time;
        }

        $("#user-info-gid").text(v.dart_userID)
        $("#background-stat-BM").text(((v.dart_bookmarks_updated) ? "已同步" : "尚未同步"))
        $("#background-stat-history").text(timeConverter(v.dart_last_history_timestamp))


    })

    /****************
     * Masonry Init *
     ****************/

    var $masonry = $('.masonry')
    $masonry.masonry({
        itemSelector: '.masonry > .col',
        columnWidth: '.m6'
    });

    /* End Masonry Init */

    /********************
     *     Chart JS     *
     ********************/

    // Global defaults
    Chart.scaleService.updateScaleDefaults('linear', {
        position: 'right'
    });

    Chart.scaleService.updateScaleDefaults('category', {
        gridLines: {
            display: false
        }
    });
    Chart.defaults.scale.gridLines.color = 'rgba(0,0,0,.08)';
    Chart.defaults.scale.gridLines.zeroLineColor = 'rgba(0,0,0,.08)';

    // Chart.defaults.bar.categoryPercentage = 1;
    Chart.defaults.bar.scales.xAxes[0].barPercentage = .85;
    Chart.defaults.bar.scales.xAxes[0].categoryPercentage = 1;
    Chart.defaults.global.legend.display = false;

    // Candlestick styles
    Chart.defaults.candlestick.scales.xAxes[0].gridLines = {
        display: false
    };
    // Chart.defaults.candlestick.scales.yAxes[0].gridLines = {display: false};

    // Point styles
    Chart.defaults.global.elements.point.radius = 0;
    Chart.defaults.global.elements.point.borderWidth = 20;
    Chart.defaults.global.elements.point.hoverRadius = 5;
    Chart.defaults.global.elements.point.backgroundColor = 'rgb(0,0,0)';
    Chart.defaults.global.elements.point.borderColor = 'rgba(0,0,0,.1)';

    // Line styles
    Chart.defaults.global.elements.line.borderColor = 'rgb(0,0,0)';

    // Area styles
    Chart.defaults.radar.elements.point = {
        hitRadius: 10,
        radius: 0,
        borderWidth: .0001,
        hoverRadius: 4,
        hoverBorderWidth: .0001,
    }
    Chart.defaults.radar.elements.line.tension = .15;
    Chart.defaults.radar.elements.line.borderWidth = 0.0001;
    Chart.defaults.radar.scale.ticks = {
        fontSize: 11
    }
    Chart.defaults.radar.scale.pointLabels = {
        fontSize: 12
    }
    Chart.scaleService.updateScaleDefaults('radialLinear', {
        gridLines: {
            color: 'rgba(0,0,0,.04)'
        }
    });

    Chart.defaults.global.tooltips = Object.assign(Chart.defaults.global.tooltips, tooltipsOpts);

    // Set default animations
    Chart.defaults.global.animation = Object.assign(Chart.defaults.global.animation, {
        duration: 700,
        easing: 'easeInOutQuint',
        onComplete: function() {
            $masonry.masonry('layout');
        }
    });

    // try {
    //     // Setup slider
    //
    //     // Create a list of day and month names.
    //     var weekdays = [
    //         "Sunday", "Monday", "Tuesday",
    //         "Wednesday", "Thursday", "Friday",
    //         "Saturday"
    //     ];
    //
    //     var months = [
    //         "January", "February", "March",
    //         "April", "May", "June", "July",
    //         "August", "September", "October",
    //         "November", "December"
    //     ];
    //
    //     // Append a suffix to dates.
    //     // Example: 23 => 23rd, 1 => 1st.
    //     function nth(d) {
    //         if (d > 3 && d < 21) return 'th';
    //         switch (d % 10) {
    //             case 1:
    //                 return "st";
    //             case 2:
    //                 return "nd";
    //             case 3:
    //                 return "rd";
    //             default:
    //                 return "th";
    //         }
    //     }
    //
    //     // Create a string representation of the date.
    //     function formatDate(date) {
    //         return weekdays[date.getDay()] + ", " +
    //             date.getDate() + nth(date.getDate()) + " " +
    //             months[date.getMonth()] + " " +
    //             date.getFullYear();
    //     }
    //     // Move formatting code into a function
    //     function toFormat(v) {
    //         return formatDate(new Date(v));
    //     }
    //
    //     var dateSlider = document.getElementById('DomainTimes-slider');
    //
    //     noUiSlider.create(dateSlider, {
    //         // Create two timestamps to define a range.
    //         range: {
    //             min: timestamp('2010'),
    //             max: timestamp('2016')
    //         },
    //
    //         // Steps of one week
    //         step: 7 * 24 * 60 * 60 * 1000,
    //
    //         // Two more timestamps indicate the handle starting positions.
    //         start: [timestamp('2011'), timestamp('2015')],
    //         tooltips: [true, true],
    //         format: {
    //             to: toFormat,
    //             from: Number
    //         }
    //     });
    //
    //     dateSlider.noUiSlider.on('end', function() {
    //         console.log(dateSlider.noUiSlider.get());
    //     });
    //
    // } catch (e) {
    //     console.log("no slider");
    // } finally {
    //
    // }

    /*******************
     *     ChartJS     *
     *******************/

    // Line chart
    // var ctx = $("#line-chart");
    // var myLineChart = new Chart(ctx, {
    //     type: 'line',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: '# of Votes',
    //             data: [12, 19, 3, 5, 2, 3],
    //             lineTension: 0,
    //             fill: 0
    //         }]
    //     },
    //     options: {
    //         hover: {
    //             mode: 'index',
    //             intersect: false
    //         },
    //         maintainAspectRatio: false,
    //     }
    // });

    // // Main Toggle Line Chart
    // var toggleData = {
    //     revenue: {
    //         label: 'Revenue',
    //         data: [1200, 940, 1340, 1440, 420, 1100, 670]
    //     },
    //     users: {
    //         label: 'Users',
    //         data: [1252, 872, 543, 1902, 1334, 998, 1640]
    //     },
    //     ctr: {
    //         label: 'CTR',
    //         data: [.18, .24, .33, .12, .23, .2, .23]
    //     }
    // }

    // var ctx = $("#main-toggle-line-chart");
    // var myLineChart = new Chart(ctx, {
    //     type: 'line',
    //     data: {
    //         labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    //         datasets: [{
    //             label: toggleData['revenue'].label,
    //             data: toggleData['revenue'].data,
    //             lineTension: 0,
    //             fill: 0
    //         }]
    //     },
    //     options: {
    //         hover: {
    //             mode: 'index',
    //             intersect: false
    //         },
    //         maintainAspectRatio: false,
    //     }
    // });

    // $("#main-toggle-line-chart")
    //     .closest('.card').find('.card-metrics')
    //     .on('click', '.card-metric', function(e) {
    //         e.stopPropagation();
    //         var card = $(this).closest('.card');
    //         var cardChart = card.find($('.card-chart'));
    //
    //         if (cardChart.length) {
    //             var chart = chartExists(cardChart);
    //             var metric = $(this).attr('data-metric');
    //
    //             if (!!chart && toggleData.hasOwnProperty(metric)) {
    //                 $(this).siblings().removeClass('active');
    //                 $(this).addClass('active');
    //                 var index = $(this).index();
    //                 var isActive = $(this).hasClass('active');
    //
    //                 chart.data.datasets[0].data = toggleData[metric].data;
    //                 chart.data.datasets[0].label = toggleData[metric].label;
    //                 chart.update();
    //             }
    //         }
    //     });


    // var compareLine = $("#compare-line-chart");
    // var compareLineChart = new Chart(compareLine, {
    //     type: 'line',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: '# of Votes',
    //             data: [12, 19, 3, 5, 2, 3],
    //             borderColor: 'rgb(244,67,54)',
    //             pointBackgroundColor: 'rgb(244,67,54)',
    //             pointBorderColor: 'rgba(244,67,54,.1)',
    //             lineTension: 0,
    //             fill: false
    //         }, {
    //             label: '# of Votes',
    //             data: [5, 12, 18, 9, 11, 14],
    //             borderColor: 'rgb(33,150,243)',
    //             pointBackgroundColor: 'rgb(33,150,243)',
    //             pointBorderColor: 'rgba(33,150,243,.1)',
    //             lineTension: 0,
    //             fill: false,
    //             hidden: true
    //         }]
    //     },
    //     options: {
    //         hover: {
    //             mode: 'index',
    //             intersect: false
    //         },
    //     }
    // });


    // Card metric chart toggle
    $(document).on('click', '.card-metric', function() {
        var card = $(this).closest('.card');
        var cardChart = card.find($('.card-chart'));

        if (cardChart.length) {
            var chart = chartExists(cardChart);

            if (!!chart) {
                $(this).toggleClass('active');
                var index = $(this).index() + $(this).closest('.card-metrics').index() * buttons_pre_row;
                var isActive = $(this).hasClass('active');

                chart.data.datasets[index].hidden = !isActive;
                chart.update();
            }
        }
    });

    // Generic card metric interactivity
    $(document).on('click', '.tab', function() {
        var card = $(this).closest('.card');
        var cardChart = card.find($('.card-chart'));

        if (cardChart.length) {
            var chart = chartExists(cardChart);

            if (!!chart) {
                var index = $(this).index();

                for (var i = 0; i < chart.data.datasets.length; i++) {
                    var isHidden = true;
                    if (i === index) {
                        isHidden = false;
                    }
                    chart.data.datasets[i].hidden = isHidden;
                }

                chart.update();
            }
        }
    });


    // // var tabLegendLine = $("#tab-legend-line-chart");
    // var tabLegendLineChart = new Chart(tabLegendLine, {
    //     type: 'line',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: 'Day',
    //             data: [12, 19, 3, 5, 2, 3],
    //             borderColor: '#ffffff',
    //             pointBackgroundColor: '#ffffff',
    //             pointBorderColor: 'rgba(255,255,255,.2)',
    //             lineTension: 0,
    //             pointStyle: 'circle',
    //             fill: false
    //         }, {
    //             label: 'Month',
    //             data: [5, 12, 18, 9, 11, 14],
    //             borderColor: '#ffffff',
    //             pointBackgroundColor: '#ffffff',
    //             pointBorderColor: 'rgba(255,255,255,.2)',
    //             lineTension: 0,
    //             pointStyle: 'circle',
    //             fill: false,
    //             hidden: true
    //         }, {
    //             label: 'Year',
    //             data: [40, 36, 24, 19, 30, 23],
    //             borderColor: '#ffffff',
    //             pointBackgroundColor: '#ffffff',
    //             pointBorderColor: 'rgba(255,255,255,.2)',
    //             lineTension: 0,
    //             pointStyle: 'circle',
    //             fill: false,
    //             hidden: true
    //         }]
    //     },
    //     options: {
    //         hover: {
    //             mode: 'index',
    //             intersect: false
    //         },
    //         scales: {
    //             xAxes: [{
    //                 gridLines: {
    //                     color: 'rgba(255,255,255,.1)'
    //                 },
    //                 ticks: {
    //                     fontColor: '#ffffff'
    //                 },
    //             }],
    //             yAxes: [{
    //                 gridLines: {
    //                     color: 'rgba(255,255,255,.1)'
    //                 },
    //                 ticks: {
    //                     fontColor: '#ffffff'
    //                 }
    //             }]
    //         },
    //         legendCallback: tabLegendCallback
    //     }
    // })
    // tabLegendLine.closest('.card-content').before($(tabLegendLineChart.generateLegend()));


    // var miniLine = $('#mini-line-chart');
    // var myMiniLineChart = new Chart(miniLine, {
    //     type: 'line',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: '',
    //             data: [12, 19, 3, 5, 2, 3],
    //             borderColor: chartColorGreen,
    //             borderWidth: 2,
    //             pointBackgroundColor: 'inherit',
    //             lineTension: 0,
    //             pointRadius: 0,
    //             pointHoverRadius: 3,
    //             fill: 0
    //         }]
    //     },
    //     options: flushChartOptions
    // });


    // var miniLine = $('#mini-flush-line-chart');
    // var miniLineChart = new Chart(miniLine, {
    //     type: 'line',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: '',
    //             data: [12, 19, 3, 5, 2, 3],
    //             borderColor: chartColorYellow,
    //             pointBackgroundColor: chartColorYellow,
    //             pointBorderColor: rgbToRgba(chartColorYellow, ".2"),
    //             lineTension: 0,
    //             fill: 0
    //         }]
    //     },
    //     options: {
    //         hover: {
    //             mode: 'index',
    //             intersect: false
    //         },
    //         legend: {
    //             display: false
    //         },
    //         scales: {
    //             xAxes: [{
    //                 display: false
    //             }],
    //             yAxes: [{
    //                 display: false
    //             }]
    //         },
    //         maintainAspectRatio: false,
    //     }
    // });


    // Bar chart
    // var barChart = $('#stacked-bar-chart');
    // if (barChart.length) {
    //     var stackedBarChart = new Chart(barChart, {
    //         type: 'bar',
    //         data: {
    //             labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //             datasets: [{
    //                 label: 'dataset 1',
    //                 data: [12, 19, 3, 5, 2, 3],
    //                 backgroundColor: chartColorBlue,
    //                 borderColor: chartColorBlue,
    //             }, {
    //                 label: 'dataset 2',
    //                 data: [4, 2, 1, 2, 4, 6],
    //                 backgroundColor: chartColorYellow,
    //                 borderColor: chartColorYellow,
    //             }, {
    //                 label: 'dataset 3',
    //                 data: [5, 10, 8, 7, 4, 9],
    //                 backgroundColor: chartColorPink,
    //                 borderColor: chartColorPink,
    //             }]
    //         },
    //         options: {
    //             hover: {
    //                 mode: 'index',
    //                 intersect: false
    //             },
    //             scales: {
    //                 xAxes: [{
    //                     stacked: true,
    //                     gridLines: {
    //                         display: false
    //                     }
    //                 }],
    //                 yAxes: [{
    //                     position: 'right',
    //                     stacked: true,
    //                     gridLines: {
    //                         color: 'rgba(0,0,0,0.08)'
    //                     }
    //                 }]
    //             },
    //         }
    //     });
    // }

    // var flushStackedChartOptions = Object.assign({}, flushChartOptions);
    // flushStackedChartOptions.scales.xAxes = [{
    //     display: false,
    //     stacked: true
    // }];
    // var miniBar = $('#mini-stacked-bar-chart');
    // var miniStackedBarChart = new Chart(miniBar, {
    //     type: 'bar',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    //         datasets: [{
    //             label: 'Blue',
    //             data: [12, 19, 3, 5, 2, 3],
    //             backgroundColor: chartColorBlue,
    //             borderColor: chartColorBlue,
    //         }, {
    //             label: 'Yellow',
    //             data: [4, 2, 1, 2, 4, 6],
    //             backgroundColor: chartColorYellow,
    //             borderColor: chartColorYellow,
    //         }, {
    //             label: 'Pink',
    //             data: [5, 10, 8, 7, 4, 9],
    //             backgroundColor: chartColorPink,
    //             borderColor: chartColorPink,
    //         }]
    //     },
    //     options: flushStackedChartOptions
    // });

    // var miniBar = $('#mini-bar-chart');
    // var miniBarChart = new Chart(miniBar, {
    //     type: 'bar',
    //     data: {
    //         labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    //         datasets: [{
    //             data: [12, 19, 4, 5, 9, 3, 7, 2, 3, 2, 4, 14],
    //             backgroundColor: chartColorBlue,
    //         }]
    //     },
    //     options: flushChartOptions
    // });


    // Area Charts
    // var data = {
    //     labels: ['one', 'two', 'three', 'four', 'five'],
    //     datasets: [{
    //         backgroundColor: rgbToRgba(chartColorPink, '.25'),
    //         borderColor: chartColorPink,
    //         pointBackgroundColor: chartColorPink,
    //         pointBorderColor: rgbToRgba(chartColorPink, '.25'),
    //         data: [2, 4, 7, 3, 8],
    //         label: 'D0'
    //     }, {
    //         backgroundColor: rgbToRgba(chartColorBlue, '.25'),
    //         borderColor: chartColorBlue,
    //         pointBackgroundColor: chartColorBlue,
    //         pointBorderColor: rgbToRgba(chartColorBlue, '.25'),
    //         data: [9, 4, 5, 1, 3],
    //         label: 'D1',
    //     }]
    // };
    //
    // var $areaChart = $('#area-chart');
    // var areaChart = new Chart($areaChart, {
    //     type: 'line',
    //     data: data,
    //     options: areaOptions
    // });



    // var data = {
    //     labels: ['one', 'two', 'three', 'four', 'five'],
    //     datasets: [{
    //         backgroundColor: chartColorPink,
    //         borderColor: chartColorPink,
    //         data: [2, 4, 7, 3, 8],
    //         label: 'D0',
    //         pointHoverRadius: 3,
    //         pointHoverBorderWidth: 1
    //     }, {
    //         backgroundColor: chartColorYellow,
    //         borderColor: chartColorYellow,
    //         data: [2, 5, 5, 7, 3],
    //         label: 'D1',
    //         pointHoverRadius: 3,
    //         pointHoverBorderWidth: 1
    //     }, {
    //         backgroundColor: chartColorBlue,
    //         borderColor: chartColorBlue,
    //         data: [9, 4, 5, 1, 3],
    //         label: 'D1',
    //         pointHoverRadius: 3,
    //         pointHoverBorderWidth: 1
    //     }]
    // };
    // var $flushAreaChart = $('#flush-area-chart');
    // var flushAreaChart = new Chart($flushAreaChart, {
    //     type: 'line',
    //     data: data,
    //     options: flushChartOptions
    // });

    // var miniLineArea = $('#mini-line-area-chart');
    // var myMiniLineAreaChart = new Chart(miniLineArea, {
    //     type: 'line',
    //     data: data,
    //     options: flushChartOptions
    // });


    // var doughnutTooltip = Object.assign({}, tooltipsOpts);
    // doughnutTooltip.intersect = true;
    // delete doughnutTooltip.mode;


    // Doughnut Chart
    // var doughnutChart = $('#doughnut-chart');
    // var doughnutTooltip = Object.assign({}, tooltipsOpts);
    // doughnutTooltip.intersect = true;
    // doughnutTooltip.callbacks = {
    //     footer: percentageFooterCallback
    // };
    // delete doughnutTooltip.mode;

    // var miniDoughnutChart = $('#mini-doughnut-chart');
    // var miniDoughnutChartJS = new Chart(miniDoughnutChart, {
    //     type: 'doughnut',
    //     data: {
    //         labels: ["Red", "Blue", "Yellow", "Green"],
    //         datasets: [{
    //             label: 'dataset 1',
    //             data: [12, 19, 3, 5],
    //             backgroundColor: [chartColorPink, chartColorBlue, chartColorYellow, chartColorGreen],
    //             borderWidth: 0
    //         }],
    //     },
    //     options: {
    //         tooltips: doughnutTooltip,
    //         cutoutPercentage: 80
    //     }
    // });


    // function setup slider
    var setupTheSlider_ = function(partID, chartID) {
        try {
            var dateSlider = document.getElementById(partID + '-slider');
            noUiSlider.create(dateSlider, {
                // Create two timestamps to define a range.
                range: {
                    'min': 0,
                    'max': data_bag[chartID]['dates'].length - 1
                },
                'limit': 90,
                'behaviour': 'drag-tap',
                'margin': 1,
                // Steps of one week
                step: 1,
                connect: true,

                // Two more timestamps indicate the handle starting positions.
                start: [data_bag[chartID]['dates'].length - 1 - default_shown_days, data_bag[chartID]['dates'].length - 1 - 1],
                tooltips: [true, true],
                format: {
                    to: function(v) {
                        return data_bag[chartID]['dates'][v.toFixed(0)]
                    },
                    from: Number
                }
            });

            // dateSlider.noUiSlider.on('change', function() {
            //     console.log("change");
            //     $("#" + partID + "-title").closest('.card-content').find('.progress').fadeIn()
            //     var card = $(this.target).closest('.card');
            //     var cardChart = card.find($('.card-chart'));
            //     if (cardChart.length) {
            //         var chart = chartExists(cardChart);
            //         dtSLT = dateSlider.noUiSlider.get()
            //         showTheReport_(partID, chartID, dtSLT[0], dtSLT[1], chart)
            //     }
            // });
            dateSlider.noUiSlider.on('set', function() {
                console.log('set');
                dtSLT = dateSlider.noUiSlider.get()
                dtSLTlast = $("#" + partID + "-title").closest('.card-content').find('.progress').data("dates")

                if (dtSLTlast[0] != dtSLT[0] || dtSLTlast[1] != dtSLT[1]) {
                    $("#" + partID + "-title").closest('.card-content').find('.progress').data("dates", dtSLT)
                    // $("#" + partID + "-title").closest('.card-content').find('.progress').fadeIn()
                    var card = $(this.target).closest('.card');
                    var cardChart = card.find($('.card-chart'));
                    if (cardChart.length) {
                        var chart = chartExists(cardChart);
                        showTheReport_(partID, chartID, dtSLT[0], dtSLT[1], chart)
                    }
                }
            });

            dtSLTinit = dateSlider.noUiSlider.get()
            $("#" + partID + "-title").closest('.card-content').find('.progress').data("dates", dtSLTinit)
            showTheReport_(partID, chartID, data_bag[chartID]['dates'][data_bag[chartID]['dates'].length - 1 - default_shown_days], data_bag[chartID]['dates'][data_bag[chartID]['dates'].length - 1 - 1])
            $("#" + partID + "-title").closest('.card-content').find('.progress').fadeOut()
        } catch (e) {
            console.log(e);
        } finally {

        }
    }

    // function for process view
    var showTheReport_ = function(partID, chartID, startDate, endDate, chart) {
        try {
            if (typeof(startDate) == 'undefined') {
                startDate = data_bag[chartID]['dates'][data_bag[chartID]['dates'].length - 1 - default_shown_days]
            }
            if (typeof(endDate) == 'undefined') {
                endDate = data_bag[chartID]['dates'][data_bag[chartID]['dates'].length - 1 - 1]
            }

            startIDX = data_bag[chartID]['dates'].indexOf(startDate)
            endIDX = data_bag[chartID]['dates'].indexOf(endDate) + 1
            $("#" + partID + "-title").text(titleMap[chartID] + " [" + startDate + " ～ " + endDate + " (" + (endIDX - startIDX) + "日)]")
            var lbl = data_bag[chartID]['dates'].slice(startIDX, endIDX)
            the_datasets = []
            buttons_html = ""
            $("#" + partID + "-buttons").empty()

            // TODO: 處理資料至對應的時間段
            tmp = {
                'datasets': data_bag[chartID]['datasets'].slice(0)
            }
            tmp['datasets'].forEach(function(domain) {
                tmp[domain] = {
                    'data': data_bag[chartID][domain]['data'].slice(startIDX, endIDX)
                }
                tmp[domain]['total'] = tmp[domain]['data'].reduce(reducer)
            })

            tmp['datasets'].sort(function(a, b) {
                return tmp[b]['total'] - tmp[a]['total']
            })
            // console.log(tmp);

            tmp2show = {
                'datasets': []
            }
            for (var i = 0, endFlag = false; i < tmp['datasets'].length; i++) {
                if (i < 10) {
                    tmp2show['datasets'].push(tmp['datasets'][i])
                } else {
                    if (tmp[tmp2show['datasets'][i - 1]]['total'] == tmp[tmp['datasets'][i]]['total']) {
                        tmp2show['datasets'].push(tmp['datasets'][i])
                    } else {
                        endFlag = true
                    }
                }

                if (endFlag) {
                    break
                }
            }

            tmp2show['datasets'].forEach(function(domain) {
                tmp2show[domain] = tmp[domain]
            })

            tmp2show['datasets'].sort(function(a, b) {
                return tmp[b]['total'] - tmp[a]['total']
            })

            // End TODO
            for (var i = 0; i < tmp2show['datasets'].length; i++) {
                var domain = tmp2show['datasets'][i]
                var the_data = tmp2show[domain]['data']
                var the_total = tmp2show[domain]['total']
                var the_color = chartColorBag[i]
                the_datasets.push({
                    'label': domain,
                    'data': the_data,
                    'borderColor': the_color,
                    'backgroundColor': the_color,
                    'pointBackgroundColor': the_color,
                    'pointBorderColor': the_color,
                    'pointHoverRadius': 3,
                    'pointHoverBorderWidth': 1,
                    'lineTension': 0,
                    'fill': 'origin',
                })

                if (i % buttons_pre_row == 0) {
                    buttons_html += '<div class="card-metrics card-metrics-centered">'
                }
                buttons_html += '<div class="card-metric colored waves-effect waves-light active" style="background-color:' + rgbToHex(the_color) + ';">'
                buttons_html += '<div class="card-metric-title">' + domain + '</div>'
                buttons_html += '<div class="card-metric-value">瀏覽' + the_total + '次</div></div>'
                if (i % buttons_pre_row == (buttons_pre_row - 1) || i + 1 == data_bag[chartID]['datasets'].length) {
                    buttons_html += '</div>'
                }
            }
            $("#" + partID + "-buttons").append(buttons_html)

            if (typeof(chart) == 'undefined') {
                var fixedLineChart = $('#' + chartID);
                var fixedLineChartJS = new Chart(fixedLineChart, {
                    type: 'line',
                    data: {
                        'labels': lbl,
                        'datasets': the_datasets
                    },
                    options: flushChartOptions
                });
            } else {
                chart.data.datasets = the_datasets
                chart.data.labels = lbl
                chart.update();
            }

        } catch (e) {
            console.log(e);
        } finally {
            chartColorBag = chartColorBag.reverse()
            $("#" + partID + "-title").closest('.card-content').find('.progress').fadeOut()
        }
    }

    // Customized
    chrome.storage.sync.get(["server_addr", "dart_userID"], function(res) {
        page_name = location.pathname.split('/')[location.pathname.split('/').length - 1].replace(".html", "")
        $.ajax({
            'type': "POST",
            'url': res.server_addr + "/report/" + page_name,
            'dataType': 'json',
            'crossDomain': true,
            'contentType': "application/json",
            'data': JSON.stringify({
                'uuid': res.dart_userID
            }),
            'success': function(xhr) {
                if ('err' in xhr) {
                    console.log(xhr);
                    setTimeout(function() {
                        location.reload()
                    }, 4000)
                    $("#modal1").modal('open');

                    var sec = 4
                    var func = function () {
                        setTimeout(function () {
                            console.log(sec);
                            $("#modal1 > div.modal-content > p").text(--sec + "秒後，將自動重新載入！")
                            func()
                        }, 1000)
                    }
                    func()

                } else {
                    console.log(xhr);
                    if (xhr['overall-DomainTimes-areaChart'].hasOwnProperty("noEnoughData") || xhr['overall-CateTimes-areaChart'].hasOwnProperty("noEnoughData") || xhr['overall-Weekday-Cate-stackedBarChart'].hasOwnProperty("noEnoughData")) {
                        $("#modal2").modal('open');
                        $("#DomainTimes").hide()
                        $("#CateTimes").hide()
                        $("#Weekday-Cate").hide()
                        $("#nodata").show()
                    }
                    else {
                        data_bag = xhr

                        setupTheSlider_("DomainTimes", "overall-DomainTimes-areaChart")
                        setupTheSlider_("CateTimes", "overall-CateTimes-areaChart")

                        chrome.storage.sync.get(["overall_tuto"], function (v) {
                            if (!v.hasOwnProperty("overall_tuto")) {
                                $("main").append("<!-- Tap Target Structure --><div class=\"tap-target\" data-target=\"DomainTimes-buttons > div:nth-child(1) > div:nth-child(1)\"><div class=\"tap-target-content\"><h5>這裡可以點擊呦～</h5><h6>可以自己設定要比較的網站</h6></div></div>")
                                M.AutoInit();
                                $('.tap-target').tapTarget('open');
                                chrome.storage.sync.set({"overall_tuto": 1})
                            }
                        })


                        try {
                            // Weekday-Cate-stackedBarChart Start
                            var chartID = 'overall-Weekday-Cate-stackedBarChart'
                            sd = xhr[chartID]['startDate'].split('-')
                            ed = xhr[chartID]['endDate'].split('-')
                            $("#Weekday-Cate-title").text("週間每日上網類型圖( " + sd[0] + "年" + sd[1] + "月至 " + ed[0] + "年" + ed[1] + "月的統計)")
                            var lbl = xhr[chartID]['dates']
                            the_datasets = []

                            for (var i = 0; i < xhr[chartID]['datasets'].length; i++) {
                                var domain = xhr[chartID]['datasets'][i]
                                var the_data = xhr[chartID][domain]['data']
                                var the_total = xhr[chartID][domain]['total']
                                if ('cnt' in xhr[chartID][domain]) {
                                    var the_cnt = xhr[chartID][domain]['cnt']
                                    domain = domain + "(" + the_cnt + "個類型)"
                                }
                                var the_color = chartColorBag[i]
                                the_datasets.push({
                                    'label': domain,
                                    'data': the_data,
                                    'borderColor': the_color,
                                    'backgroundColor': the_color,
                                })
                            }

                            var barChart = $('#' + chartID);
                            if (barChart.length) {
                                var stackedBarChart = new Chart(barChart, {
                                    type: 'bar',
                                    data: {
                                        labels: lbl,
                                        datasets: the_datasets
                                    },
                                    options: {
                                        hover: {
                                            mode: 'index',
                                            intersect: false
                                        },
                                        scales: {
                                            xAxes: [{
                                                stacked: true,
                                                gridLines: {
                                                    display: false
                                                }
                                            }],
                                            yAxes: [{
                                                position: 'left',
                                                stacked: true,
                                                gridLines: {
                                                    color: 'rgba(0,0,0,0.08)'
                                                }
                                            }]
                                        },
                                    }
                                });
                            }

                            $("#Weekday-Cate-title").closest('.card-content').find('.progress').fadeOut()
                            // Weekday-Cate-stackedBarChart End
                        } catch (e) {
                            console.log(e);
                        }
                        chartColorBag = chartColorBag.reverse()
                    }


                }
            },
            'error': function(xhr) {
                console.log("Fail!");
                console.log(xhr);
                setTimeout(function() {
                    location.reload()
                }, 4000)
                $("#modal1").modal('open');
            }
        });

    })
});
