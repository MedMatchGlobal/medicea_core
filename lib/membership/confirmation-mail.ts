import nodemailer from 'nodemailer';
import {membershipPreviewEnabled} from './config';
export function confirmationMailTransport(){
 if(!membershipPreviewEnabled()||process.env.MEDICEA_CONFIRMATIONS_PREVIEW!=='true')throw Error('CONFIRMATION_MAIL_DISABLED');
 const pass=process.env.MEDICEA_BILLING_SMTP_PASSWORD;
 if(!pass)throw Error('BILLING_SMTP_PASSWORD_REQUIRED');
 return nodemailer.createTransport({host:'mail.privateemail.com',port:465,secure:true,auth:{user:'billing@medicea.global',pass},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
}
