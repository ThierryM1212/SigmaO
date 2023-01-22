import React, { Fragment } from 'react';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { processExerciseRequest, refundBuyRequest } from '../ergo-related/mint';
import { formatERGAmount, formatLongString } from '../utils/utils';
import { ExerciseOptionRequest } from '../utils/ExerciseOptionRequest';
import { UNDERLYING_TOKENS } from '../utils/script_constants';


export default class ExerciseOptionRequests extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exerciseOptionRequestsList: [],
        };
        this.fetchOptionRequests = this.fetchOptionRequests.bind(this);
    }

    async fetchOptionRequests() {
        const allExerciseOptionRequests = (await Promise.all(UNDERLYING_TOKENS.map(async tok => {
            const eOptRequests = await getUnspentBoxesForAddressUpdated(tok.exerciseOptionScriptAddress);
            return eOptRequests;
        }))).flat();
        const exerciseOptionsRequests = await Promise.all(allExerciseOptionRequests.map(async box => { return await ExerciseOptionRequest.create(box) }));
        this.setState({ exerciseOptionRequestsList: exerciseOptionsRequests })
    }

    async componentDidMount() {
        await this.fetchOptionRequests();
    }

    async processExercise(box) {
        await processExerciseRequest(box);
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
                                        <td>{formatLongString(exerciseRequest.optionTokenID, 6)}</td>
                                        <td>{exerciseRequest.optionAmount}</td>
                                        <td>{formatERGAmount(exerciseRequest.value)} ERG</td>
                                        <td>
                                            <div className='d-flex flex-row justify-content-center'>
                                                <button className='btn btn-yellow' onClick={() => this.processExercise(exerciseRequest.full)}>Process</button>
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
