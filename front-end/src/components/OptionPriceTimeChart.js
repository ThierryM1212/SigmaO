import React from 'react';

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
import { enGB } from 'date-fns/locale';
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

ChartJS.defaults.color = 'rgba(255,255,255,0.9)'

export const options = {
    responsive: true,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    stacked: false,
    
    scales: {
        x: {
            type: "time",
            time: {
                unit: 'day',
                displayFormats: {
                    day: 'MM-dd-yyyy'
                }
            },
            adapters: {
                date: {
                    locale: enGB
                }
            },
        },
        y: {
            type: 'linear',
            title: {
                display: true,
                text: "Option price (ERG)",
            },
            display: true,
            position: 'left',
            ticks: {
                // Include a dollar sign in the ticks
                callback: function(value, index, ticks) {
                    return formatERGAmount(value);
                }
            }
        }
    },
};

function getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = startDate.valueOf();
    const step = Math.round((stopDate - startDate) / 150);
    while (currentDate <= stopDate.valueOf()) {
        dateArray.push(new Date (currentDate));
        currentDate = currentDate + step;
    }
    return dateArray;
}

export function OptionPriceTimeChart(props) {
    const labels= getDates(new Date(), props.maturityDate);
    const optionTypeNum = OPTION_TYPES.find(o => o.label === props.optionType).id;
    const optionStyleNum = OPTION_STYLES.find(o => o.label === props.optionStyle).id;
    const data = {
        labels,
        datasets: [
            {
                label: 'Option price over time',
                data: labels.map(pricingDate => parseInt(getOptionPrice(optionTypeNum, optionStyleNum, pricingDate, props.maturityDate, props.oraclePrice, props.strikePrice,
                    props.shareSize, props.sigma, props.K1, props.K2))),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y',
            },
        ],
    };

    return <Line options={options} data={data} />;
}