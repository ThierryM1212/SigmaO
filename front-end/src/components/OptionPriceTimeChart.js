import React from 'react';

import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { enGB } from 'date-fns/locale';
import { Line } from 'react-chartjs-2';
import { formatERGAmount, getOptionPrice, getOptionPriceBS } from '../utils/utils';
import { OPTION_STYLES, OPTION_TYPES } from '../utils/constants';

Chart.register(...registerables);

Chart.defaults.color = 'rgba(255,255,255,0.9)'

export const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        filler: {
            propagate: true
        }
    },
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
                callback: function (value, index, ticks) {
                    return formatERGAmount(value);
                }
            }
        }
    },
};

function getDateRange(startDate, stopDate, numPoints) {
    var dateArray = [];
    var currentDate = startDate.valueOf();
    const step = Math.round((stopDate - startDate) / numPoints);
    while (currentDate <= stopDate.valueOf()) {
        dateArray.push(new Date(currentDate));
        currentDate = currentDate + step;
    }
    return dateArray;
}

export function OptionPriceTimeChart(props) {
    console.log("OptionPriceTimeChart", props);
    const labels = getDateRange(new Date(), props.maturityDate, 20);
    const optionTypeNum = OPTION_TYPES.find(o => o.label === props.optionType)?.id ?? props.optionType;
    const optionStyleNum = OPTION_STYLES.find(o => o.label === props.optionStyle)?.id ?? props.optionStyle;
    var dataSets = [];
    const optionPrices = labels.map(pricingDate => parseInt(getOptionPrice(optionTypeNum, optionStyleNum, pricingDate, props.maturityDate, props.oraclePrice, props.strikePrice,
        props.shareSize, props.sigma, props.K1, props.K2)));
    dataSets.push(
        {
            label: 'Option price SigmaO over time',
            data: optionPrices,
            borderColor: 'rgb(0, 99, 0)',
            backgroundColor: 'rgba(0, 99, 0, 0.5)',
            yAxisID: 'y',
        }
    );
    if (props.showBSBench) {
        const optionPricesBS = labels.map(pricingDate => parseInt(getOptionPriceBS(optionTypeNum, pricingDate, props.maturityDate, props.oraclePrice, props.strikePrice,
            props.shareSize, props.sigma)));
        dataSets.push(
            {
                label: 'Option price over time \nBlack-Sholes',
                data: optionPricesBS,
                borderColor: 'rgb(0, 99, 132, 0.3)',
                backgroundColor: 'rgba(0, 99, 132, 0.3)',
                borderDash: [5, 5],
                yAxisID: 'y',
            }
        )
        if (props.showBSError) {
            const errorBS = optionPrices.map((v, i) => Math.abs(v - optionPricesBS[i]));
            dataSets.push(
                {
                    label: 'Price error against \nBlack-Sholes',
                    data: errorBS,
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    yAxisID: 'y',
                    type: 'bar',
                }
            )
        }
    }
    //if (props.showTrinomialBench || props.showBinomialBench) {
    //    var valuationType = "trinomial";
    //    if (props.showBinomialBench) {
    //        valuationType = "binomial";
    //    }
    //    const optionPricesTree = labels.map(pricingDate => parseInt(getOptionPriceTree(valuationType, optionTypeNum, optionStyleNum, pricingDate, props.maturityDate, props.oraclePrice, props.strikePrice,
    //        props.shareSize, props.sigma)))
    //    dataSets.push(
    //        {
    //            label: 'Option price over time ' + valuationType,
    //            data: optionPricesTree,
    //            borderColor: 'rgb(0, 99, 0, 0.3)',
    //            backgroundColor: 'rgba(0, 99, 0, 0.3)',
    //            borderDash: [5, 5],
    //            yAxisID: 'y',
    //        }
    //    )
    //    if (props.showTreeError) {
    //        const errorBS = optionPrices.map((v, i) => Math.abs(v - optionPricesTree[i]));
    //        dataSets.push(
    //            {
    //                label: 'Price error against ' + valuationType,
    //                data: errorBS,
    //                borderColor: 'rgba(255, 0, 132, 0.5)',
    //                backgroundColor: 'rgba(255, 0, 132, 0.5)',
    //                yAxisID: 'y',
    //                type: 'bar',
    //            }
    //        )
    //    }
    //}


    const data = {
        labels,
        datasets: dataSets,
    };

    return <Line options={options} data={data} />;
}