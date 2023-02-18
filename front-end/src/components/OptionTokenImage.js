import TokenImage from './TokenImage';

export default function OptionTokenImage(props) {

    return (
        <a href={'/option-details/' + props.tokenId} target="_blank" rel="noreferrer">
            <div className="parent-image" style={{ width: props.width, height: props.width, }}>
                <span className="Centerer"></span>
                <TokenImage tokenId={props.underlyingTokenId}
                    width={Math.round(props.width * 4 / 10)}
                    over={true}
                    alt={props.underlyingTokenId} />
            </div>
        </a>
    )
}