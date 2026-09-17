import {useState} from 'react';
import {useAppSelector} from '../store/hooks';
import {translate} from 'google-translate-api-x';

export default function useLanguage() {
  // const selectedLanguage = useAppSelector(state => {
  //   return state.account.selectedLanguage;
  // });

  const selectedLanguage = "English";

  const languageValidation = (value: string) => {
    let temp = value;
    translate(value, {
      from: 'en',
      to: selectedLanguage,
    })
      .then(e => {
        temp = e?.text ?? '';
      })
      .catch(er => {
        console.log('err', er);
      });
    return temp;
  };

  return {languageValidation};
}
