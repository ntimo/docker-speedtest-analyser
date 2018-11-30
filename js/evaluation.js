/**
 * all the custom
 * @author github/roest01
 */
jQuery(document).ready(function(){
    var colors = {
        orange: "rgba(255,190,142,0.5)",
        black: "rgba(90,90,90,1)",
        green: "rgba(143,181,178,0.8)"
    };
    var data = {
        labels:[] ,
        datasets: [
            {
                label: appConfig.labels.ping,
                isMB: false,
                fill: false,
                backgroundColor: colors.black,
                borderColor: colors.black,
                tension: 0
            },
            {
                label: appConfig.labels.upload,
                isMB: true,
                fill: true,
                backgroundColor: colors.green,
                borderColor: colors.green,
                tension: 0
            },
            {
                label: appConfig.labels.download,
                isMB: true,
                fill: true,
                backgroundColor: colors.orange,
                borderColor: colors.orange,
                tension: 0
            }
        ]
    };


    var chartDom = jQuery("#speedChart").get(0).getContext("2d");
    var chartJS = new Chart(chartDom, {
        type: "line",
        data: data,
        options: {
            tooltips: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(item, data){
                        if (data.datasets[item.datasetIndex].isMB){
                            return data.datasets[item.datasetIndex].label + ": "+ item.yLabel + ' MBits/s'
                        }
                        return data.datasets[item.datasetIndex].label + ": " + item.yLabel;
                    }
                }
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            responsive: true,
            multiTooltipTemplate: "<%if (datasetLabel){%><%=datasetLabel%>: <%}%><%= value %> <%if (datasetLabel != appConfig.labels.ping){%>Mb/s<%}%>"
            //maintainAspectRatio: false
        }
    });


    var ParseManager = function(){
        var parseManager = this;
        parseManager.header = null;
        parseManager._startDate = null;
        parseManager._endDate = null;
        parseManager._chart = null;
        parseManager.i = 0;

        /**
         * parse result.csv and create graph with _startDate and _endDate filter
         */
        parseManager.parse = function(){
            var parseManager = this;
            parseManager.i = 0;

            Papa.parse("data/result.csv", {
                download: true,
                step: function(row) { //using stream to allow huge file progressing
                    parseManager.i++;
                    var dataArr = row.data[0];
                    if (!parseManager.header || parseManager.i === 1){
                        parseManager.header = dataArr;
                    } else {
                        //build csv array
                        var measureRow = [];
                        for (i = 0; i < dataArr.length; i++) {
                            measureRow[parseManager.header[i]] = dataArr[i];
                        }
                        measureRow['timestamp_s'] = parseInt(measureRow['timestamp'] / 1000); //from ms timestamp to secounds
                        measureRow['timestamp'] = parseInt(measureRow['timestamp']); //from save ms timestamp

                        if (!!parseManager._startDate && !!parseManager._endDate){
                            if (measureRow['timestamp_s'] < parseManager._startDate.unix() || measureRow['timestamp_s'] > parseManager._endDate.unix()){
                                //not in filter
                                return;
                            }
                        }

                        parseManager.addRow(measureRow);
                    }
                }
            });
        };

        /**
         * add a row to chart
         *
         * @param measureRow
         */
        parseManager.addRow = function(measureRow){
            var chart = parseManager._chart;
            var chartData = chart.config.data;
            chartData.labels.push(this.getDateFromData(measureRow));

            chartData.datasets[0].data.push(
                measureRow['ping']
            );
            chartData.datasets[1].data.push(
                measureRow['upload']
            );
            chartData.datasets[2].data.push(
                measureRow['download']
            );

            parseManager._chart.config.data = chartData;
            chart.update();
        };

        parseManager.flushChart = function(force, callback){
            var parseManager = this;
            var chart = parseManager._chart;

            chart.data.labels = [];
            chart.data.datasets.forEach(function(dataSet){
                dataSet.data = [];
            });

            parseManager._chart.update();
            callback();
            return true;
        };


        parseManager.getDateFromData = function(measureRow){
            return moment(new Date(measureRow['timestamp'])).format('L - LT')
        };


        /**
         * set start date as filter
         *
         * @param startDate
         * @returns {ParseManager}
         */
        parseManager.setStartDate = function(startDate){
            parseManager._startDate = startDate;
            return parseManager;
        };

        /**
         * set end date as filter
         *
         * @param endDate
         * @returns {ParseManager}
         */
        parseManager.setEndDate = function(endDate){
            parseManager._endDate = endDate;
            return parseManager;
        };

       /**
         *
         * @param chart {*|e}
         * @returns {ParseManager}
         */
        this.setChart = function(chart){
            this._chart = chart;
            return this;
        };

        /**
         * set a new filter and update the graph
         *
         * @param startDate
         * @param endDate
         */
        this.update = function(startDate, endDate){
            var parseManager = this;
            parseManager._startDate = startDate;
            parseManager._endDate = endDate;

            parseManager.flushChart(true, function(){
                parseManager.parse();
            });
        };
    };

    var daterangeConfig = {
        locale: {
            format: appConfig.dateFormat
        },
        "autoApply": true,
        "opens": "left"
    };

    jQuery.extend(daterangeConfig, appConfig.daterange);

    //init application
    jQuery(document).ready(function(){
        var parseManager = new ParseManager();
        parseManager.setChart(chartJS);
        var dateRange = jQuery('input[name="daterange"]');
        dateRange.daterangepicker(
            daterangeConfig,
            function(start, end) {
                parseManager.update(start,end);
            });

        moment.locale(appConfig.locale);

        if (appConfig.daterange.startDate && appConfig.daterange.endDate){
            parseManager
                .setStartDate(appConfig.daterange.startDate)
                .setEndDate(appConfig.daterange.endDate);
        }
        parseManager.parse();
    });
});
