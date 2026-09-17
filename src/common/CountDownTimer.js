import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { TWENTY, BOLD, SECOND } from './AppText';

function CountDownTimer({ startDate, endDate }) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  function parseISODate(dateString) {
    const parts = dateString.split('T');
    const datePart = parts[0];
    const timePart = parts[1] ? parts[1]?.split('.')[0] : '00:00:00';
    const [year, month, day] = datePart?.split('-');
    const [hours, minutes, seconds] = timePart.split(':');
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

function calculateTimeRemaining() {
    const now = new Date();
    const end = parseISODate(endDate);
    const start = parseISODate(startDate);

    if (now >= end) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    let diff;
    if (now < start) {
      diff = start - now;
    } else {
      diff = end - now;
    }
  
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
    return { days, hours, minutes, seconds };
  }
  
 
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    // <div className="css-fj1yy5">
    //   <span>{timeRemaining.days.toString().padStart(2, '0')}<small>Days</small></span>
    //   <span>{timeRemaining.hours.toString().padStart(2, '0')}<small>Hrs</small></span>
    //   <span>{timeRemaining.minutes.toString().padStart(2, '0')}<small>Min.</small></span>
    //   <span>{timeRemaining.seconds.toString().padStart(2, '0')}<small>Sec.</small></span>
    // </div>
    <View
        style={{
          borderColor: 'white',
          borderRadius: 20,
          borderWidth: 1,
          borderStyle: 'dashed',
          marginVertical: 10,
          paddingVertical: 10
        }}>
        <View
          style={{flexDirection: 'row', justifyContent: 'space-evenly'}}>
          <AppText type={TWENTY} weight={BOLD}>
          {timeRemaining.days.toString().padStart(2, '0')}
          </AppText>
          <AppText type={TWENTY} weight={BOLD}>
          {timeRemaining.hours.toString().padStart(2, '0')}
          </AppText>
          <AppText type={TWENTY} weight={BOLD}>
          {timeRemaining.minutes.toString().padStart(2, '0')}
          </AppText>
          <AppText type={TWENTY} weight={BOLD}>
          {timeRemaining.seconds.toString().padStart(2, '0')}
          </AppText>
        </View>
        <View
          style={{flexDirection: 'row', justifyContent: 'space-evenly'}}>
          <AppText type={TWENTY} weight={BOLD} color={SECOND}>
            Days
          </AppText>
          <AppText type={TWENTY} weight={BOLD} color={SECOND}>
            Hrs
          </AppText>
          <AppText type={TWENTY} weight={BOLD} color={SECOND}>
            min.
          </AppText>
          <AppText type={TWENTY} weight={BOLD} color={SECOND}>
            sec.
          </AppText>
        </View>
      </View>
  );
}

export default CountDownTimer;