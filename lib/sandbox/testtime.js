const nodemailer = require('nodemailer');

const smtpOptions = {
    host: 'smtp.webfaction.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'infranodus',
      pass: 'inndlP33'
    }
}
const mailOptions = {
    from: `contact@infranodus.com`,
    to: 'paranyushkin@gmail.com',
    subject: `Recover Password for InfraNodus`,
    text: `Hey lets recover this password`,
    replyTo: `noreply@8infranodus.com`
}

const transporter = nodemailer.createTransport(smtpOptions);

transporter.sendMail(mailOptions, function(err, res) {
    if (err) {
      console.error('there was an error: ', err);
    } else {
      console.log('here is the res: ', res)
    }
});
