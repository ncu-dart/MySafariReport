// $(document).ready(function() {
//
//     // M.AutoInit();
//     // $("#settings").on("click", function() {
//     //     chrome.tabs.create({
//     //         selected: true,
//     //         url: "./modules/options/options.html"
//     //     });
//     // })
// });

chrome.storage.sync.get(["dart_userID"], function(v) {
    getRewardInfo(v.dart_userID, function(x){
        if (x.points.length === 0) {
            $("#reward").hide()
        }
    }, "points")
})

/*!
 * Admin v1.0.2
 * Materialize theme
 * http://materializecss.com/themes.html
 * Personal Use License
 * by Alan Chang
 */


/****************
 * Chart Colors *
 ****************/
// var chartColorYellow = "rgb(255,196,0)";
// var chartColorBlue = "rgb(0,176,255)";
// var chartColorPink = "rgb(255,64,129)";
// var chartColorGreen = "rgb(112,190,116)";

function rgbToRgba(rgb, alpha) {
    return rgb.replace(')', ', ' + alpha + ')').replace('rgb', 'rgba');
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
    var digits = /(.*?)rgb\((\d+),(\d+),(\d+)\)/.exec(rgb);
    var r = parseInt(digits[2]);
    var g = parseInt(digits[3]);
    var b = parseInt(digits[4]);
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? "rgb(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + ")" : null;
}

// red
// var chartColorRedl1 = hexToRgb("#ef5350")
// var chartColorReda2 = hexToRgb("#ff5252")

// pink
var chartColorPinkl3 = hexToRgb("#f48fb1")
var chartColorPinkd1 = hexToRgb("#d81b60")

// purple
var chartColorPurplel3 = hexToRgb("#ce93d8")
var chartColorPurpled1 = hexToRgb("#8e24aa")

// deep puple
var chartColorDeepPurplel1 = hexToRgb("#7e57c2")

// indigo
var chartColorIndigol3 = hexToRgb("#9fa8da")
var chartColorIndigod1 = hexToRgb("#3949ab")

// blue
var chartColorBluel3 = hexToRgb("#90caf9")
var chartColorBlued1 = hexToRgb("#1e88e5")

// light-blue
var chartColorLightBlue = hexToRgb("#039be5")

// cyan
var chartColorCyanl3 = hexToRgb("#80deea")
var chartColorCyand1 = hexToRgb("#00acc1")

// teal
var chartColorTeall3 = hexToRgb("#80cbc4")
var chartColorTeald1 = hexToRgb("#00897b")

//green
var chartColorGreenl3 = hexToRgb("#a5d6a7")
var chartColorGreend1 = hexToRgb("#43a047")

// light-green
var chartColorLightGreenl1 = hexToRgb("#8bc34a")

// lime
var chartColorLimel3 = hexToRgb("#e6ee9c")
var chartColorLimed1 = hexToRgb("#c0ca33")

// yellow
var chartColorYellowa4 = hexToRgb("#ffd600")

// amber
var chartColorAmberl3 = hexToRgb("#ffe082")
var chartColorAmberd1 = hexToRgb("#ffb300")

// orange
var chartColorOrangel3 = hexToRgb("#ffcc80")
var chartColorOranged1 = hexToRgb("#fb8c00")

// deep-orange
var chartColorDeepOrange = hexToRgb("#ff5722")


var chartColorBag = [
    // chartColorRedl1, chartColorReda2,
    chartColorPinkl3, chartColorPinkd1,
    chartColorPurplel3, chartColorPurpled1,
    chartColorDeepPurplel1,
    chartColorIndigol3, chartColorIndigod1,
    chartColorBluel3, chartColorBlued1,
    chartColorLightBlue,
    chartColorCyanl3, chartColorCyand1,
    chartColorTeall3, chartColorTeald1,
    chartColorGreenl3, chartColorGreend1,
    chartColorLightGreenl1,
    chartColorLimel3, chartColorLimed1,
    chartColorYellowa4,
    chartColorAmberl3, chartColorAmberd1,
    chartColorOrangel3, chartColorOranged1,
    chartColorDeepOrange
]

chartColorBag = shuffle_the_(chartColorBag)


/* End Chart Colors */



/********************
 * Helper Functions *
 ********************/
var debounce = function(fn, duration) {
    var timeout;
    return function() {
        var args = Array.prototype.slice.call(arguments),
            ctx = this;

        clearTimeout(timeout);
        timeout = setTimeout(function() {
            fn.apply(ctx, args);
        }, duration);
    };
};

var chartExists = function(cardChart) {
    var exists = false;
    for (var i in Chart.instances) {
        chart = Chart.instances[i];
        if (cardChart.is(chart.canvas)) {
            exists = true;
            break;
        }
    }

    if (exists) {
        return chart;
    } else {
        return false;
    }
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function shuffle_the_(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

// Create a new date from a string, return as a timestamp.
function timestamp(str) {
    return new Date(str).getTime();
}

function getRandomBarNoTime(lastClose) {
    var open = randomNumber(lastClose * .95, lastClose * 1.05);
    var close = randomNumber(open * .95, open * 1.05);
    var high = randomNumber(Math.max(open, close), Math.max(open, close) * 1.1);
    var low = randomNumber(Math.min(open, close) * .9, Math.min(open, close));
    return {
        o: open,
        h: high,
        l: low,
        c: close,
    };
}

function randomBar(date, lastClose) {
    var bar = getRandomBarNoTime(lastClose);
    bar.t = date.valueOf();
    return bar;
}

function getRandomData(date, count) {
    var dateFormat = 'MMMM DD YYYY';
    var date = moment(date, dateFormat);
    var data = [randomBar(date, 30)];
    while (data.length < count) {
        date = date.clone().add(1, 'd');
        if (date.isoWeekday() <= 5) {
            data.push(randomBar(date, data[data.length - 1].c));
        }
    }
    return data;
}

/* End Helper Functions */

/*************************
 * Chart Common Settings *
 *************************/
var tooltipsOpts = {
    enabled: false,
    mode: 'index',
    intersect: false,
    backgroundColor: '#fff',
    cornerRadius: 2,
    caretSize: 0,
    xPadding: 12,
    yPadding: 12,
    custom: function(tooltipModel) {
        // Tooltip Element
        var tooltipEl = document.getElementById('chartjs-tooltip');

        // Create element on first render
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.innerHTML = "<table></table>"
            document.body.appendChild(tooltipEl);
        }

        // Hide if no tooltip
        if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        // Set caret Position
        tooltipEl.classList.remove('above', 'below', 'no-transform');
        if (tooltipModel.yAlign) {
            tooltipEl.classList.add(tooltipModel.yAlign);
        } else {
            tooltipEl.classList.add('no-transform');
        }

        function getBody(bodyItem) {
            return bodyItem.lines;
        }

        // Set Text
        if (tooltipModel.body) {
            var titleLines = tooltipModel.title || [];
            var bodyLines = tooltipModel.body.map(getBody);
            var footerLines = tooltipModel.footer;
            var innerHtml = '<thead>';

            titleLines.forEach(function(title) {
                innerHtml += '<tr><th>' + title + '</th></tr>';
            });
            innerHtml += '</thead><tbody>';

            bodyLines.forEach(function(body, i) {
                var colors = tooltipModel.labelColors[i];
                var span = '';

                // Add color key if more than 1 dataset
                if (bodyLines.length > 1) {
                    var style =
                        span = '<span class="chartjs-tooltip-key" style="background:' + colors.backgroundColor + ';"></span>';
                }

                innerHtml += '<tr><td>' + span + body + '</td></tr>';
            });

            if (footerLines.length) {
                innerHtml += '<tfoot>';
                footerLines.forEach(function(footer, i) {
                    innerHtml += '<tr><td>' + footer + '</td></tr>'
                });
                innerHtml += '</tfoot>';
            }

            innerHtml += '</tbody>';

            var tableRoot = tooltipEl.querySelector('table');
            tableRoot.innerHTML = innerHtml;
        }

        // `this` will be the overall tooltip
        var position = this._chart.canvas.getBoundingClientRect();


        // Display, position, and set styles for font
        tooltipEl.style.opacity = 1;
        tooltipEl.style.left = $(window).scrollLeft() + position.left + tooltipModel.caretX + 20 + 'px';
        tooltipEl.style.top = $(window).scrollTop() + position.top + tooltipModel.caretY + 'px';
        tooltipEl.style.fontSize = tooltipModel.fontSize;
        tooltipEl.style.fontStyle = tooltipModel._fontStyle;
        tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
    }

};

// Area Options
var areaOptions = {
    maintainAspectRatio: false,
    spanGaps: false,
    elements: {
        line: {
            tension: 0.4
        }
    },
    scales: {
        yAxes: [{
            stacked: true
        }]
    },
    plugins: {
        filler: {
            propagate: false
        }
    }
};

var flushChartOptions = Object.assign({}, areaOptions);
flushChartOptions.hover = {
    hover: {
        mode: 'index',
        intersect: false
    }
};
flushChartOptions.legend = {
    display: false
};
flushChartOptions.scales = {
    xAxes: [{
        type: 'time',
        time: {
            unit: 'day',
            distribution: 'series',
            displayFormats: {
                quarter: 'MM/DD'
            }
        },
        display: true
    }],
    yAxes: [{
        display: true,
        stacked: true
    }]
};

/* End Chart Common Settings */


/*******************
 * Chart Callbacks *
 *******************/

// Tooltip Callbacks
var percentageFooterCallback = function(tooltipItems, data) {
    var label = "";
    var sum = 0;
    var val = 0;
    tooltipItems.forEach(function(tooltipItem) {
        val = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
        data.datasets[tooltipItem.datasetIndex].data.forEach(function(datasetVal) {
            sum += datasetVal;
        });
    });

    var perc = ((val / sum) * 100).toFixed(1);
    return perc + '%';
}

var percentageStackedFooterCallback = function(tooltipItems, data) {
    var label = "";
    var sum = 0;
    var val = 0;
    tooltipItems.forEach(function(tooltipItem) {
        val = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
        data.datasets.forEach(function(dataset) {
            sum += dataset.data[tooltipItem.index];
        });
    });

    var perc = ((val / sum) * 100).toFixed(1);
    return perc + '%';
}

// Doughnut callbacks
var doughnutLegendCallback = function(chart) {
    var $legend = $('<div class="chart-legend"></div>');
    var $ul = $('<ul></ul>');
    var labels = chart.data.labels;
    if (chart.data.datasets.length) {
        for (var i = 0; i < chart.data.datasets[0].data.length; i++) {
            var val = chart.data.datasets[0].data[i];
            var color = chart.data.datasets[0].backgroundColor[i];
            var $li = $('<li><span style="background-color: ' + color + '" class="dot"></span><span class="label">' + labels[i] + '</span><span class="value">' + val + '</span></li>');
            $ul.append($li);
        }
    }

    $legend.append($ul);
    return $legend;
};

var percDoughnutLegendCallback = function(chart) {
    $legend = $('<div class="perc-doughnut-legend"></div>');
    if (chart.data.datasets.length) {
        var total = 0;
        var maxPerc = 0;
        var maxColor = "#000000";
        for (var i = 0; i < chart.data.datasets[0].data.length; i++) {
            var val = chart.data.datasets[0].data[i];
            var color = chart.data.datasets[0].backgroundColor[i];
            if (val > maxPerc) {
                maxPerc = val;
                maxColor = color;
            }
            total += val;
        }
        $legend.text((maxPerc / total * 100).toFixed(1) + '%');
        $legend.css('color', maxColor);
    }
    return $legend;
};

// Legend callbacks
var cardLegendCallback = function(chart) {
    var $legend = $('<div class="card-metrics"></div>');
    for (var i = 0; i < chart.data.datasets.length; i++) {
        var dataset = chart.data.datasets[i];
        var $metric = $('<div class="card-metric colored waves-effect waves-light active"></div>');
        if (dataset.borderColor) {
            $metric.css({
                backgroundColor: dataset.borderColor
            });
        }
        var $title = $('<div class="card-metric-title">' + dataset.label + '</div>');
        var sum = dataset.data.reduce(function(total, num) {
            return total + num;
        });
        var $value = $('<div class="card-metric-value">' + sum + '</div>');
        $metric.append($title);
        $metric.append($value);
        $legend.append($metric);
    }
    return $legend;
};

var tabLegendCallback = function(chart) {
    var $legend = $('<div class="card-tabs"></div>');
    var $tabs = $('<ul class="tabs tabs-fixed-width tabs-transparent"></ul>');
    for (var i = 0; i < chart.data.datasets.length; i++) {
        var dataset = chart.data.datasets[i];
        var $tab = $('<li class="tab"></li>');
        var $title = $('<a href="#">' + dataset.label + '</a>');
        $tab.append($title);
        $tabs.append($tab);
    }
    $legend.append($tabs);
    return $legend;
};

/* End Chart Callbacks */
