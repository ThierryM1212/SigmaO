import { useState, useEffect } from 'react';
import { BOT_STATUS_URL } from '../utils/constants';

function useApiPolling(apiFunction, delay) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFunction();
        setData(response);
      } catch (error) {
        console.error(error);
      }
    };

    const intervalId = setInterval(fetchData, delay);

    // Clear the interval on unmount
    return () => clearInterval(intervalId);
  }, [apiFunction, delay]);

  return data;
}

export function BotPooler() {
  const data = useApiPolling(getDataFromApi, 30000);

  // Render the data
  return (
    <div></div>
  );
}

async function getDataFromApi() {
  try {
    const response = await fetch(BOT_STATUS_URL);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error(error);
  }
}
