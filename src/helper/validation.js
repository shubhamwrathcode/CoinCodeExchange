export const isText = RegExp(/^[A-Z ]{3,}$/i);
export const isEmail = RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);
export const isPhone = RegExp(/^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4,6})$/);
export const isPassword = RegExp(/^[a-zA-Z0-9!@#$%^&*]{8,16}$/);
export const isOtp = RegExp(/^[0-9 ]{6}/i);
export const SigninValidate = {
  email: {
    required: false,
    validator: {
      regEx: isEmail,

      error: 'Please enter a valid email',
    },
  },
  password: {
    required: false,
    validator: {
      regEx: isPassword,
      error:
        'Password should contain characters, number and special character.',
    },
  },
};
export const register = {
  firstName: {
    required: false,
    validator: {
      regEx: isText,
      error: 'Please provide a valid name ',
    },
  },
  lastName: {
    required: false,
    validator: {
      regEx: isText,
      error: 'Please provide a valid name ',
    },
  },
  email: {
    required: false,
    validator: {
      regEx: isEmail,
      error: 'Please enter a valid email',
    },
  },
  password: {
    required: false,
    validator: {
      regEx: isPassword,
      error:
        'Password should contain characters, number and special character.',
    },
  },

  referalCode: {
    required: false,
    validator: {
      length: 10,
      error: 'Minimum 10 characters required.',
    },
  },
};

export const resetPassword = {
  otp: {
    required: false,
    validator: {
      length: 5,
      error: 'Please Enter Valid OTP',
    },
  },
  password: {
    required: false,
    validator: {
      regEx: isPassword,
      error:
        'Password should contain characters, number and special character.',
    },
  },
};
export const forgotPassword = {
  email: {
    required: false,
    validator: {
      regEx: isEmail,

      error: 'Please enter a valid email',
    },
  },
};
export const otpValidation = {
  otp: {
    required: false,
    validator: {
      regEx: isPassword,
      error:
        'Password should contain characters, number and special character.',
    },
  },
  password: {
    required: false,
    validator: {
      regEx: isPassword,
      error:
        'Password should contain characters, number and special character.',
    },
  },
};
