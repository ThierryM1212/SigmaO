import React, { Fragment } from 'react';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { formatERGAmount, formatLongString } from '../utils/utils';
import { ExerciseOptionRequest } from '../objects/ExerciseOptionRequest';
import { EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS } from '../utils/script_constants';
import { processExerciseRequest } from '../actions/botOptionAction';
import { refundBuyRequest } from '../actions/BuyRequestActions';


export default class ExerciseOptionRequests extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exerciseOptionRequestsList: [],
        };
        this.fetchOptionRequests = this.fetchOptionRequests.bind(this);
    }

    async fetchOptionRequests() {
        const allExerciseOptionRequests = await getUnspentBoxesForAddressUpdated(EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS);
        console.log("ExerciseOptionRequests", allExerciseOptionRequests);
        const exerciseOptionsRequests = await Promise.all(allExerciseOptionRequests.map(async box => { return await ExerciseOptionRequest.create(box) }));
        this.setState({ exerciseOptionRequestsList: exerciseOptionsRequests })
    }

    async componentDidMount() {
        await this.fetchOptionRequests();
    }

    async processExercise(exerciseRequest) {
        await processExerciseRequest(exerciseRequest);
    }
    
    async refundRequest(box) {
        await refundBuyRequest(box);
    }

    render() {
        return (
            <Fragment >
                <div className="card zonemint p-1 m-1">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Box id</th>
                                <th>Issuer</th>
                                <th>Option token ID</th>
                                <th>Option amount</th>
                                <th>Value</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.exerciseOptionRequestsList.map(exerciseRequest => {
                                    return <tr key={exerciseRequest.full.boxId}>
                                        <td>{formatLongString(exerciseRequest.full.boxId, 6)}</td>
                                        <td>{formatLongString(exerciseRequest.exerciseAddress, 6)}</td>
                                        <td>{formatLongString(exerciseRequest.optionTokenId, 6)}</td>
                                        <td>{exerciseRequest.optionAmount}</td>
                                        <td>{formatERGAmount(exerciseRequest.value)} ERG</td>
                                        <td>
                                            <div className='d-flex flex-row justify-content-center'>
                                                <button className='btn btn-yellow' onClick={() => this.processExercise(exerciseRequest)}>Process</button>
                                                &nbsp;
                                                <button className='btn btn-blue' onClick={() => this.refundRequest(exerciseRequest.full)}>Refund</button>
                                            </div>
                                        </td>
                                    </tr>
                                })
                            }

                        </tbody>
                    </Table>
                </div >
            </Fragment >
        )
    }
}
