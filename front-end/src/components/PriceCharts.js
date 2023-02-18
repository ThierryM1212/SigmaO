import React, { Fragment } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { OptionPriceTimeChart } from '../components/OptionPriceTimeChart';
import { OptionPriceUnderlyingPriveChart } from '../components/OptionPriceUnderlyingPriveChart';


export default class PriceCharts extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionType: props.optionType,
            optionStyle: props.optionStyle,
            shareSize: props.shareSize,
            strikePrice: props.strikePrice,
            maturityDate: props.maturityDate,
            sigma: props.sigma,
            K1: props.K1,
            K2: props.K2,
            oraclePrice: props.oraclePrice,
            oraclePriceGraph: props.oraclePrice,
            pricingDate: new Date(),
        };
        this.setOraclePriceGraph = this.setOraclePriceGraph.bind(this);
        this.setPricingDate = this.setPricingDate.bind(this);
    }

    setOraclePriceGraph = (oraclePrice) => { this.setState({ oraclePriceGraph: oraclePrice.replace(/[^0-9]/g, "") }); };
    setPricingDate = (date) => { this.setState({ pricingDate: date }); };

    componentDidUpdate(prevProps, prevState) {
        if (prevProps !== this.props) {
            this.setState({ ...this.props });
        }
    }

    render() {
        return (
            <Fragment >
                <div className="card zonemint p-1 m-2">
                    <div>
                        <div className='d-flex flex-row'>
                            <h5>Option price simulation</h5>

                        </div>
                        <div className='d-flex flex-wrap align-items-center'>
                            <div className='d-flex flex-column  m-1 p-2 zonegraph'>
                                <div className='d-flex flex-row justify-content-start align-items-end'>
                                    <label htmlFor="underlyingPrice" className='d-flex justify-content-start align-items-start'>Underlying price</label>
                                    &nbsp;
                                    <input type="text"
                                        id="underlyingPrice"
                                        className="form-control input-dark col-sm-4"
                                        onChange={e => this.setOraclePriceGraph(e.target.value)}
                                        value={this.state.oraclePriceGraph}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className='graph-container'>
                                    <OptionPriceTimeChart
                                        optionType={this.state.optionType}
                                        optionStyle={this.state.optionStyle}
                                        maturityDate={this.state.maturityDate}
                                        oraclePrice={this.state.oraclePriceGraph}
                                        strikePrice={this.state.strikePrice}
                                        shareSize={this.state.shareSize}
                                        sigma={this.state.sigma}
                                        K1={this.state.K1}
                                        K2={this.state.K2}
                                        showBSBench={true}
                                        showBSError={true}
                                        showBinomialBench={true}
                                        showTreeError={true}
                                    />
                                </div>
                            </div>
                            <div className='d-flex flex-column  m-1 p-2 zonegraph'>
                                <div className='d-flex flex-row justify-content-start align-items-end '>
                                    <label htmlFor="pricingDate" className='d-flex justify-content-start align-items-start'>Pricing date</label>
                                    &nbsp;
                                    <div>
                                        <DatePicker
                                            className='input-dark form-control'
                                            selected={this.state.pricingDate}
                                            onChange={(date) => this.setPricingDate(date)}
                                            dateFormat="Pp"
                                            excludeDateIntervals={[{ start: 0, end: new Date() }]}
                                        />
                                    </div>
                                </div>
                                <div className='graph-container'>
                                    <OptionPriceUnderlyingPriveChart
                                        optionType={this.state.optionType}
                                        optionStyle={this.state.optionStyle}
                                        maturityDate={this.state.maturityDate}
                                        oraclePrice={this.state.oraclePrice}
                                        strikePrice={this.state.strikePrice}
                                        shareSize={this.state.shareSize}
                                        sigma={this.state.sigma}
                                        K1={this.state.K1}
                                        K2={this.state.K2}
                                        pricingDate={this.state.pricingDate}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            </Fragment >
        )
    }
}
