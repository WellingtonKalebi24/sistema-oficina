declare module "nodemailer" {
  export type SendMailOptions = {
    from: string;
    subject: string;
    text: string;
    to: string;
  };

  export type TransportOptions = {
    auth?: {
      pass: string;
      user: string;
    };
    host: string;
    port: number;
    secure: boolean;
  };

  export type Transporter = {
    sendMail(options: SendMailOptions): Promise<unknown>;
  };

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
