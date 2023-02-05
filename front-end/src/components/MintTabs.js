import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import './react-tabs.css';
import MintOption from './MintOption';
import Options from './Options';
import BuyOptionRequests from './BuyOptionRequests';
import ExerciseOptionRequests from './ExerciseOptionRequests';
import MintSellOption from './MintSellOption';
import SellOptionRequests from './SellOptionRequests';


export default class MintTabs extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className='w-100 d-flex justify-content-center'>
                <Tabs className='w-75' selectedTabClassName="react-tabs-tab-selected" >
                    <TabList className='w-100'>
                        <Tab key={1}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Options &nbsp;
                            </div>
                        </Tab>
                        <Tab key={2}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Mint option &nbsp;
                            </div>
                        </Tab>
                        <Tab key={3}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Buy option requests &nbsp;
                            </div>
                        </Tab>
                        <Tab key={4}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Exercise option requests &nbsp;
                            </div>
                        </Tab>
                        <Tab key={5}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Create option sale &nbsp;
                            </div>
                        </Tab>
                        <Tab key={6}>
                            <div className='d-flex flex-row align-items-center justify-content-between'>
                                Options on sale &nbsp;
                            </div>
                        </Tab>
                    </TabList>

                    <TabPanel key={1}>
                        <Options />
                    </TabPanel>
                    <TabPanel key={2}>
                        <MintOption />
                    </TabPanel>
                    <TabPanel key={3}>
                        <BuyOptionRequests />
                    </TabPanel>
                    <TabPanel key={4}>
                        <ExerciseOptionRequests />
                    </TabPanel>
                    <TabPanel key={5}>
                        <MintSellOption />
                    </TabPanel>
                    <TabPanel key={6}>
                        <SellOptionRequests />
                    </TabPanel>

                </Tabs>
            </div>
        )
    }
}
