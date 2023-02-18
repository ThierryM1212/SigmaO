import React, { useEffect, useRef } from 'react';

function MatrixBackground({ timeout }) {
    const canvas = useRef();

    useEffect(() => {
        const context = canvas.current.getContext('2d');

        const width = document.body.offsetWidth;
        const height = document.body.offsetHeight;
        canvas.current.width = width;
        canvas.current.height = height;

        context.fillStyle = '#000';
        context.fillRect(0, 0, width, height);

        // calculate how many 'lines' to show and animate
        const columns = Math.floor(width / 20) + 1;
        const yPositions = Array.from({ length: columns }).fill(0);

        context.fillStyle = '#000';
        context.fillRect(0, 0, width, height);

        const matrixEffect = () => {
            context.fillStyle = '#0001';
            context.fillRect(0, 0, width, height);

            context.fillStyle = '#0f0';
            context.font = '15pt monospace';

            yPositions.forEach((y, index) => {
                const text = String.fromCharCode(Math.random() * 128);
                const x = index * 20;
                context.fillText(text, x, y);

                if (y > 100 + Math.random() * 10000) {
                    yPositions[index] = 0;
                } else {
                    yPositions[index] = y + 20;
                }
            });
        };

        const interval = setInterval(matrixEffect, timeout);
        return () => {
            clearInterval(interval);
        };
    }, [canvas, timeout]);

    return (
        <div
            style={{
                // custom styles to make it show up in the background
                background: '#000000',
                overflow: 'hidden',
                position: 'fixed',
                height: '100%',
                width: '100%',
                zIndex: -1,
                left: '0',
                top: '0',
                color: '#FFFFFF'
            }}
        >
            <canvas
                ref={canvas}
            />
        </div>
    );
}

export default MatrixBackground;
