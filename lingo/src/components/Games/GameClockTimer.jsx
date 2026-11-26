import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export function GameClockTimer({
  endsAt,
  serverTime,
  clientReceivedAt,
  className = 'solo-clock-pill quiz-timer',
  urgentThresholdSec = 30,
  showIcon = true,
  iconSize = 14
}) {
  const calcRemaining = () => {
    if (!endsAt) return 0;
    const offset = (serverTime && clientReceivedAt) ? (serverTime - clientReceivedAt) : 0;
    return Math.max(0, Math.ceil((endsAt - (Date.now() + offset)) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calcRemaining);

  useEffect(() => {
    setSecondsLeft(calcRemaining());
    if (!endsAt) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft(calcRemaining());
    }, 500);
    return () => clearInterval(interval);
  }, [endsAt, serverTime, clientReceivedAt]);

  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <span className={`${className}${secondsLeft <= urgentThresholdSec ? ' urgent' : ''}`}>
      {showIcon && <Clock size={iconSize} />}
      <span>{formattedTime}</span>
    </span>
  );
}
