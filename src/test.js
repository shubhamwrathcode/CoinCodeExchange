const userData = { emailId: "test@test.com", email_id: "test@test.com", "2fa": 0, mobileNumber: "undefined" };
const hasEmail = !!(userData?.emailId || userData?.email_id);
const hasMobile = !!(userData?.mobileNumber || userData?.mobile_number);
console.log({ hasEmail, hasMobile });
