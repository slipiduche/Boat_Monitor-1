"use strict";
const nodemailer = require("nodemailer");

// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  

  // create reusable transporter object using the default SMTP transport

  try
  {
    let testAccount = await nodemailer.createTestAccount();


    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
    

    let data = {username:"alejandrocamacaro91@gmail.com",password:"CAT"};
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Fred Foo 👻" <foo@example.com>', // sender address
      to: "alejandrocamacaro91@gmail.com", // list of receivers
      subject: "CAT ✔", // Subject line
      text: `You have requested your credentials for Boat Monitoring\n\r
             \n\rUsername:${data.username}
             \n\rYour New Password:${data.password}`, // plain text body
      html: `<p>You have requested your credentials for Boat Monitoring App:</p>
             <ul>
                  <li style="line-height: 2;"><strong>Username</strong>:${data.username}</li>
                  <li><strong>Your New Password</strong>:${data.password}</li>
             </ul>`, // html body
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }
  catch(error)
  {
      console.log("CAT")
  }

  console.log('it just failed');

}

main().catch(console.error);