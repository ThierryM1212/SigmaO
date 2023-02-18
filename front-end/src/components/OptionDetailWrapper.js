import React from 'react';
import { useParams } from 'react-router-dom';
import OptionDetails from '../pages/OptionDetails';

const OptionDetailWrapper = () => {
    const { tokenId } = useParams();
    return <div className='w-100'>
        {tokenId ? <OptionDetails tokenId={tokenId} /> : null}
    </div>
}

export default OptionDetailWrapper;