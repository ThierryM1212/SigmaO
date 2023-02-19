# Off-chain bot for SigmaO
    - Mint, deliver, close options
    - Process exercise requests
    - Process buy requests, match priced option sell requests and fixed proce token sales
    - Close sell empty requests

## Install and run

    - npm install
    - node sigmao-bot.js

## Run with pm2

    - pm2 start sigmao-bot.js --max_memory_restart 300M
