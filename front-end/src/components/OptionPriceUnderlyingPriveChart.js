import React from 'react';

/* global BigInt */

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { formatERGAmount, getOptionPrice } from '../utils/utils';
import { OPTION_STYLES, OPTION_TYPES } from '../utils/constants';

ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

ChartJS.defaults.color = "rgba(255, 255, 255, 0.9)";

export const options = {
    responsive: true,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    stacked: false,
    defaults: {
        color: "#FFFFFF",
    },
    scales: {
        x: {
            type: "linear",
            title: {
                display: true,
                text: "Underlying price (ERG)",
                
            },
            ticks: {
                callback: function (value, index, ticks) {
                    return formatERGAmount(value);
                }
            },
            color: "#FFFFFF",
        },
        y: {
            type: 'linear',
            title: {
                display: true,
                text: "Oprion price (ERG)",
            },
            position: 'left',
            ticks: {
                callback: function (value, index, ticks) {
                    return formatERGAmount(value);
                }
            }
        }
    },
};

function getRange(start, stop) {
    var resArray = [];

    var step = BigInt((BigInt(stop) - BigInt(start)) / BigInt(50));
    
    if (step <= BigInt(0)) {
        step = BigInt(1);
    }
    var current = BigInt(start);
    while (current <= BigInt(stop)) {
        resArray.push(current);
        current = current + step;
    }
    console.log("getRange", step, resArray.length)
    return resArray.map(i => parseInt(i));
}

export function OptionPriceUnderlyingPriveChart(props) {
    var date = props.pricingDate;
    const labels = getRange(parseInt(props.oraclePrice / 3), props.oraclePrice * 3);
    const optionTypeNum = OPTION_TYPES.find(o => o.label === props.optionType).id;
    const optionStyleNum = OPTION_STYLES.find(o => o.label === props.optionStyle).id;
    //console.log("labels", labels)
    const data = {
        labels,
        datasets: [
            {
                label: 'Option price at ' + date.toDateString(),
                data: labels.map(underlyingPrice => parseInt(getOptionPrice(optionTypeNum, optionStyleNum, date, props.maturityDate, underlyingPrice, props.strikePrice,
                    props.shareSize, props.sigma, props.K1, props.K2))),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y',
            },
        ],
    };

    return <Line options={options} data={data} />;
}